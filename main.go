package main

import (
	"fmt"

	hook "github.com/robotn/gohook"
)

func main() {
	add()

	low()
}

func add() {
	fmt.Println("--- Please press ctrl + shift + a to stop hook ---")
	hook.Register(hook.KeyDown, []string{"alt", "space"}, func(e hook.Event) {
		fmt.Println("alt-space")
		hook.End()
	})

	fmt.Println("--- Please press w---")
	hook.Register(hook.KeyDown, []string{"w"}, func(e hook.Event) {
		fmt.Println("keyDown: ", "w")
	})

	hook.Register(hook.KeyUp, []string{"w"}, func(e hook.Event) {
		fmt.Println("keyUp: ", "w")
	})

	s := hook.Start()
	<-hook.Process(s)
}

func low() {
	evChan := hook.Start()
	defer hook.End()

	for ev := range evChan {
		fmt.Println("hook: ", ev)
	}
}
