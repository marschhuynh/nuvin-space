// Test for Todo Completion Reminder System

import { SystemReminderGenerator } from './nuvin-ui/frontend/src/lib/agents/system-reminders';
import type { MessageContext } from './nuvin-ui/frontend/src/lib/agents/system-reminders';

// Mock test scenarios
const testScenarios = [
  {
    name: 'Empty Todo List',
    todoState: {
      todos: [],
      isEmpty: true,
      hasInProgress: false,
      recentChanges: false,
      allCompleted: false,
      completedCount: 0,
      totalCount: 0,
    },
    expectedReminderId: 'todo-empty'
  },
  {
    name: 'All Todos Completed',
    todoState: {
      todos: [
        { id: '1', content: 'Task 1', status: 'completed' },
        { id: '2', content: 'Task 2', status: 'completed' },
        { id: '3', content: 'Task 3', status: 'completed' }
      ],
      isEmpty: false,
      hasInProgress: false,
      recentChanges: true,
      allCompleted: true,
      completedCount: 3,
      totalCount: 3,
    },
    expectedReminderId: 'todo-all-completed'
  },
  {
    name: 'Mixed Todo Status',
    todoState: {
      todos: [
        { id: '1', content: 'Task 1', status: 'completed' },
        { id: '2', content: 'Task 2', status: 'in_progress' },
        { id: '3', content: 'Task 3', status: 'pending' }
      ],
      isEmpty: false,
      hasInProgress: true,
      recentChanges: false,
      allCompleted: false,
      completedCount: 1,
      totalCount: 3,
    },
    expectedReminderId: 'todo-status'
  },
  {
    name: 'Single Completed Todo',
    todoState: {
      todos: [
        { id: '1', content: 'Single task', status: 'completed' }
      ],
      isEmpty: false,
      hasInProgress: false,
      recentChanges: true,
      allCompleted: true,
      completedCount: 1,
      totalCount: 1,
    },
    expectedReminderId: 'todo-all-completed'
  }
];

function testTodoCompletionReminders() {
  console.log('🧪 Testing Todo Completion Reminder System\n');

  const generator = new SystemReminderGenerator();

  testScenarios.forEach((scenario, index) => {
    console.log(`Test ${index + 1}: ${scenario.name}`);
    console.log('Todo State:', JSON.stringify(scenario.todoState, null, 2));

    const context: MessageContext = {
      messageType: 'user',
      conversationId: 'test-conversation',
      messageContent: 'Test message',
      messageHistory: [],
      todoListState: scenario.todoState
    };

    const reminders = generator.generateReminders(context);
    console.log('Generated Reminders:', reminders.length);

    if (reminders.length > 0) {
      const todoReminder = reminders.find(r => r.type === 'todo-status');
      if (todoReminder) {
        console.log('✅ Reminder ID:', todoReminder.id);
        console.log('📝 Content:', todoReminder.content);

        if (todoReminder.id === scenario.expectedReminderId) {
          console.log('✅ PASS: Expected reminder generated');
        } else {
          console.log('❌ FAIL: Expected', scenario.expectedReminderId, 'but got', todoReminder.id);
        }
      } else {
        console.log('❌ FAIL: No todo reminder generated');
      }
    } else {
      console.log('ℹ️  No reminders generated');
    }

    console.log('─'.repeat(50));
  });
}

// Example usage scenarios
console.log(`
📋 Todo Completion Reminder Examples:

1. **Empty List**: "Your todo list is empty. Consider creating one if needed."

2. **All Complete**: "🎉 Excellent work! All 3 todo items completed successfully.
   You can celebrate this achievement or ask about new tasks."

3. **Mixed Status**: "Current todo list: 3 items (1 in progress). Continue working."

4. **Single Complete**: "🎉 Excellent work! All 1 todo item completed successfully."

The system now provides contextual feedback based on todo completion status!
`);

// Run the test
testTodoCompletionReminders();

export { testTodoCompletionReminders };