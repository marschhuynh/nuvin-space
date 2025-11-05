<--- Last few GCs --->

[90536:0xcb8000000]    48693 ms: Scavenge (interleaved) 4047.4 (4127.1) -> 4047.4 (4128.1) MB, pooled: 0 MB, 18.08 / 0.00 ms  (average mu = 0.295, current mu = 0.274) allocation failure;
[90536:0xcb8000000]    49489 ms: Scavenge (interleaved) 4048.4 (4128.1) -> 4048.4 (4151.1) MB, pooled: 0 MB, 796.33 / 0.00 ms  (average mu = 0.295, current mu = 0.274) allocation failure;


<--- JS stacktrace --->

FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----

 1: 0x102d33c58 node::OOMErrorHandler(char const*, v8::OOMDetails const&) [/usr/local/bin/node]
 2: 0x102f5cd98 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, v8::OOMDetails const&) [/usr/local/bin/node]
 3: 0x103147038 v8::internal::Heap::stack() [/usr/local/bin/node]
 4: 0x103145444 v8::internal::Heap::CollectGarbage(v8::internal::AllocationSpace, v8::internal::GarbageCollectionReason, v8::GCCallbackFlags) [/usr/local/bin/node]
 5: 0x10313a180 v8::internal::HeapAllocator::AllocateRawWithLightRetrySlowPath(int, v8::internal::AllocationType, v8::internal::AllocationOrigin, v8::internal::AllocationAlignment) [/usr/local/bin/node]
 6: 0x10313a9bc v8::internal::HeapAllocator::AllocateRawWithRetryOrFailSlowPath(int, v8::internal::AllocationType, v8::internal::AllocationOrigin, v8::internal::AllocationAlignment) [/usr/local/bin/node]
 7: 0x10311d438 v8::internal::Factory::NewFillerObject(int, v8::internal::AllocationAlignment, v8::internal::AllocationType, v8::internal::AllocationOrigin) [/usr/local/bin/node]
 8: 0x103520774 v8::internal::Runtime_AllocateInYoungGeneration(int, unsigned long*, v8::internal::Isolate*) [/usr/local/bin/node]
 9: 0x1039a1af4 Builtins_CEntry_Return1_ArgvOnStack_NoBuiltinExit [/usr/local/bin/node]
10: 0x10390fca8 Builtins_GrowFastSmiOrObjectElements [/usr/local/bin/node]
11: 0x10ed6ad7c
12: 0x10eb25080
13: 0x10eb25fb0
14: 0x10eb2d418
15: 0x10eb0d078
16: 0x10eb2563c
17: 0x10eb0afd8
18: 0x10eb0d328
19: 0x10ea77350
20: 0x10eb0cdcc
21: 0x10eb0f034
22: 0x10eb0ea2c
23: 0x10eb25a9c
24: 0x10ea7b2d8
25: 0x10e975e6c
26: 0x10390ac0c Builtins_JSEntryTrampoline [/usr/local/bin/node]
27: 0x10390a8f4 Builtins_JSEntry [/usr/local/bin/node]
28: 0x1030a2dbc v8::internal::(anonymous namespace)::Invoke(v8::internal::Isolate*, v8::internal::(anonymous namespace)::InvokeParams const&) [/usr/local/bin/node]
29: 0x1030a2700 v8::internal::Execution::Call(v8::internal::Isolate*, v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::Object>, int, v8::internal::Handle<v8::internal::Object>*) [/usr/local/bin/node]
30: 0x102f73520 v8::Function::Call(v8::Local<v8::Context>, v8::Local<v8::Value>, int, v8::Local<v8::Value>*) [/usr/local/bin/node]
31: 0x102c51cd4 node::InternalMakeCallback(node::Environment*, v8::Local<v8::Object>, v8::Local<v8::Object>, v8::Local<v8::Function>, int, v8::Local<v8::Value>*, node::async_context, v8::Local<v8::Value>) [/usr/local/bin/node]
32: 0x102c51fac node::InternalMakeCallback(v8::Isolate*, v8::Local<v8::Object>, v8::Local<v8::Function>, int, v8::Local<v8::Value>*, node::async_context, v8::Local<v8::Value>) [/usr/local/bin/node]
33: 0x102cc36ac node::Environment::CheckImmediate(uv_check_s*) [/usr/local/bin/node]
34: 0x1038f226c uv__run_check [/usr/local/bin/node]
35: 0x1038eb7f4 uv_run [/usr/local/bin/node]
36: 0x102c524e4 node::SpinEventLoopInternal(node::Environment*) [/usr/local/bin/node]
37: 0x102d7dcf4 node::NodeMainInstance::Run(node::ExitCode*, node::Environment*) [/usr/local/bin/node]
38: 0x102d7da90 node::NodeMainInstance::Run() [/usr/local/bin/node]
39: 0x102cf159c node::Start(int, char**) [/usr/local/bin/node]
40: 0x19d7a5d54 start [/usr/lib/dyld]
fish: Job 1, 'nuvin-cli' terminated by signal SIGABRT (Abort)