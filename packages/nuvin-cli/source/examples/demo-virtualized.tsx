#!/usr/bin/env tsx
import React, { useState, useMemo } from 'react';
import { Box, Text, render, useInput } from 'ink';

type Item = {
	id: number;
	text: string;
	height: number;
};

const generateItems = (count: number): Item[] =>
	Array.from({ length: count }, (_, i) => ({
		id: i,
		text: `Item ${i} - ${'content '.repeat(Math.floor(Math.random() * 5) + 1)}`,
		height: Math.floor(Math.random() * 8) + 3,
	}));

const ITEMS = generateItems(10000);

const ItemBox = ({ item }: { item: Item }) => {
	const contentLines = Math.max(1, item.height - 2);

	return (
		<Box
			flexDirection="column"
			paddingX={1}
			borderStyle="round"
			borderColor="cyan"
			height={item.height}
		>
			<Box>
				<Text color="cyan" bold>
					#{item.id}
				</Text>
				<Text> </Text>
				<Text>{item.text}</Text>
			</Box>
			{Array.from({ length: contentLines - 1 }, (_, i) => (
				<Text key={i} color="gray" dimColor>
					Line {i + 1} of {contentLines - 1} (height: {item.height})
				</Text>
			))}
		</Box>
	);
};

function TextInput({
	value,
	onChange,
	placeholder = '',
	focus = true,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	focus?: boolean;
}) {
	useInput(
		(input, key) => {
			if (key.backspace || key.delete) {
				onChange(value.slice(0, -1));
			} else if (!key.ctrl && !key.meta && input && !key.return) {
				onChange(value + input);
			}
		},
		{ isActive: focus },
	);

	return (
		<Box>
			<Text color="cyan">❯ </Text>
			<Text>{value || <Text color="gray">{placeholder}</Text>}</Text>
			{focus && <Text color="cyan">▋</Text>}
		</Box>
	);
}

function VirtualizedList<T extends { height: number }>({
	items,
	renderItem,
	overscan = 5,
	height = 25,
	focus = true,
}: {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	overscan?: number;
	height?: number;
	focus?: boolean;
}) {
	const [scrollY, setScrollY] = useState(0);

	const { itemOffsets, totalHeight } = useMemo(() => {
		const offsets: number[] = [];
		let total = 0;
		for (const item of items) {
			offsets.push(total);
			total += item.height;
		}
		return { itemOffsets: offsets, totalHeight: total };
	}, [items]);

	const findStartIndex = (scrollPos: number): number => {
		let low = 0;
		let high = itemOffsets.length - 1;
		while (low < high) {
			const mid = Math.floor((low + high) / 2);
			if (itemOffsets[mid] < scrollPos) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}
		return Math.max(0, low - 1);
	};

	useInput(
		(input, key) => {
			const scrollStep = 3;
			if (input === 'j' || key.downArrow) {
				setScrollY((y) => Math.min(y + scrollStep, Math.max(0, totalHeight - height)));
			}
			if (input === 'k' || key.upArrow) {
				setScrollY((y) => Math.max(0, y - scrollStep));
			}
			if (input === 'g') {
				setScrollY(0);
			}
			if (input === 'G') {
				setScrollY(Math.max(0, totalHeight - height));
			}
			if (key.pageDown) {
				setScrollY((y) => Math.min(y + height, Math.max(0, totalHeight - height)));
			}
			if (key.pageUp) {
				setScrollY((y) => Math.max(0, y - height));
			}
		},
		{ isActive: focus },
	);

	const visibleRange = useMemo(() => {
		if (items.length === 0) return { start: 0, end: -1 };

		const startIndex = Math.max(0, findStartIndex(scrollY) - overscan);

		let endIndex = startIndex;
		let accHeight = itemOffsets[startIndex] || 0;
		while (endIndex < items.length && accHeight < scrollY + height + overscan * 10) {
			accHeight += items[endIndex].height;
			endIndex++;
		}
		endIndex = Math.min(items.length - 1, endIndex + overscan);

		return { start: startIndex, end: endIndex };
	}, [items, scrollY, height, overscan, itemOffsets, findStartIndex]);

	const topOffset = itemOffsets[visibleRange.start] || 0;
	const visibleItems = items.slice(visibleRange.start, visibleRange.end + 1);

	const scrollPercent = totalHeight > height ? Math.round((scrollY / (totalHeight - height)) * 100) : 0;
	const currentItem = findStartIndex(scrollY);

	return (
		<Box flexDirection="column">
			<Text color="gray" dimColor>
				Scroll: {scrollY}/{totalHeight - height} ({scrollPercent}%) | Visible: {visibleRange.start}-{visibleRange.end} | Current: #{currentItem}
			</Text>
			<Box flexDirection="row" height={height}>
				<Box flexDirection="column" flexGrow={1} overflow="hidden">
					<Box flexDirection="column" marginTop={-(scrollY - topOffset)}>
						{visibleItems.map((item, i) => (
							<Box key={visibleRange.start + i} flexShrink={0}>
								{renderItem(item, visibleRange.start + i)}
							</Box>
						))}
					</Box>
				</Box>
				<Box flexDirection="column" width={1} marginLeft={1}>
					{Array.from({ length: height }, (_, i) => {
						const thumbStart = Math.floor((height * scrollY) / totalHeight);
						const thumbSize = Math.max(1, Math.floor((height * height) / totalHeight));
						const isThumb = i >= thumbStart && i < thumbStart + thumbSize;
						return (
							<Text key={i} color={isThumb ? 'cyan' : 'gray'}>
								{isThumb ? '┃' : '│'}
							</Text>
						);
					})}
				</Box>
			</Box>
		</Box>
	);
}

function App() {
	const [inputValue, setInputValue] = useState('');
	const [inputFocused, setInputFocused] = useState(true);

	useInput((_input, key) => {
		if (key.tab) {
			setInputFocused((f) => !f);
		}
	});

	const filteredItems = useMemo(() => {
		if (!inputValue.trim()) return ITEMS;
		const searchQuery = inputValue.toLowerCase();
		return ITEMS.filter((item) => item.text.toLowerCase().includes(searchQuery) || item.id.toString().includes(searchQuery));
	}, [inputValue]);

	return (
		<Box flexDirection="column" width={80} height={38}>
			<Text bold color="green">
				VirtualizedList Demo ({ITEMS.length.toLocaleString()} items, variable heights 3-10)
			</Text>
			<Text color="gray">Tab = switch focus | {inputFocused ? 'Input focused (type to filter)' : 'List focused (j/k/g/G to scroll)'}</Text>
			<Box height={1} />
			<Box
				borderStyle="round"
				borderColor={inputFocused ? 'green' : 'gray'}
				paddingX={1}
			>
				<TextInput
					value={inputValue}
					onChange={setInputValue}
					placeholder="Type to filter items..."
					focus={inputFocused}
				/>
			</Box>
			<Text color="gray" dimColor>
				Showing {filteredItems.length.toLocaleString()} of {ITEMS.length.toLocaleString()} items
			</Text>
			<Box height={1} />
			<VirtualizedList
				items={filteredItems}
				renderItem={(item) => <ItemBox item={item} />}
				overscan={5}
				height={24}
				focus={!inputFocused}
			/>
		</Box>
	);
}

render(<App />);
