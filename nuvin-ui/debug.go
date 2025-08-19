package main

import (
  "context"
  "fmt"
  "math/rand/v2"

  runtime "nuvin-ui/internal/v3compat"
)

// Debug is a simple Wails v3 service for ad-hoc logging/tests.
type Debug struct{}

func NewDebug() *Debug { return &Debug{} }

// LogRandomTest logs a simple debug message with a random value and returns it.
func (d *Debug) LogRandomTest() string {
  msg := fmt.Sprintf("[Debug] Random test value: %d", rand.Int())
  runtime.LogInfo(context.Background(), msg)
  return msg
}

