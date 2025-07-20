# 🚀 Quick MCP Test Guide

## Step 1: Add Test MCP Server

1. **Open the application** (should be at http://localhost:34115)
2. **Go to Settings → MCP**
3. **Click "Add Server"**
4. **Fill in**:
   - **Name**: `Test Server`
   - **Command**: `python3 /Users/marsch/Projects/nuvin-agent/test_mcp_server.py`
   - **Enabled**: ✅
   - **Description**: `Test server with echo and add tools`
5. **Click "Save"**

## Step 2: Verify Server is Running

- Look for **Green "Connected" badge**
- Should show **"2 tools"** 
- If you see errors, check the command path is correct

## Step 3: Check Tools are Available

1. **Go to Settings → Debug tab**
2. **Click "Load Tool Debug Info"** or **"Refresh"**
3. **Look for**:
   - **MCP Tools section** should show:
     - `mcp_test-server_echo` (Available)
     - `mcp_test-server_add` (Available)
   - **"Actually Available to Agent"** should include these tools

## Step 4: Test in Chat

1. **Go back to Dashboard** (main chat)
2. **Try these messages**:

**Test Echo:**
```
Can you echo back "Hello MCP World!"?
```

**Test Add:**
```
What is 15 + 27?
```

## Step 5: Check Browser Console

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Look for MCP logs** like:
   ```
   [MCP] Found 2 MCP tools, adding available ones to agent
   [MCP] Added tool 'mcp_test-server_echo' from server 'test-server'
   [MCP] Added tool 'mcp_test-server_add' from server 'test-server'
   ```

## ✅ Success Indicators

- **Settings → Debug** shows MCP tools as "Available"
- **Browser console** shows MCP tools being added to agent
- **Agent uses tools** when you ask questions
- **Tools return results** like "Echo: Hello MCP World!" or "The sum of 15 and 27 is 42"

## 🔧 If It's Not Working

1. **Check server status** - should be "Connected"
2. **Check browser console** for errors
3. **Verify Python path** - try `which python3` in terminal
4. **Check Wails logs** in the terminal where you ran `wails dev`

## 🎯 What Should Happen

The agent should **automatically detect and use** MCP tools without any additional configuration. The tools are now **always available** to agents when the MCP server is running.