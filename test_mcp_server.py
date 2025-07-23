#!/usr/bin/env python3
"""
Simple test MCP server for testing the Nuvin Agent MCP integration.
"""

import json
import sys
import logging

# Set up logging to stderr so we can see what's happening
logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger(__name__)

def handle_request(request):
    """Handle incoming JSON-RPC requests"""
    method = request.get('method')
    logger.info(f"Handling request: {method}")

    if method == 'initialize':
        return {
            'protocolVersion': '2024-11-05',
            'capabilities': {
                'tools': {},
                'resources': {}
            },
            'serverInfo': {
                'name': 'test-mcp-server',
                'version': '1.0.0'
            }
        }

    elif method == 'tools/list':
        return {
            'tools': [
                {
                    'name': 'echo',
                    'description': 'Echo back the input message',
                    'inputSchema': {
                        'type': 'object',
                        'properties': {
                            'message': {
                                'type': 'string',
                                'description': 'Message to echo back'
                            }
                        },
                        'required': ['message']
                    }
                },
                {
                    'name': 'add',
                    'description': 'Add two numbers together',
                    'inputSchema': {
                        'type': 'object',
                        'properties': {
                            'a': {
                                'type': 'number',
                                'description': 'First number'
                            },
                            'b': {
                                'type': 'number',
                                'description': 'Second number'
                            }
                        },
                        'required': ['a', 'b']
                    }
                }
            ]
        }

    elif method == 'tools/call':
        tool_name = request.get('params', {}).get('name')
        arguments = request.get('params', {}).get('arguments', {})

        if tool_name == 'echo':
            message = arguments.get('message', 'Hello from MCP!')
            return {
                'content': [
                    {
                        'type': 'text',
                        'text': f'Echo: {message}'
                    }
                ]
            }

        elif tool_name == 'add':
            a = arguments.get('a', 0)
            b = arguments.get('b', 0)
            result = a + b
            return {
                'content': [
                    {
                        'type': 'text',
                        'text': f'The sum of {a} and {b} is {result}'
                    }
                ]
            }

        else:
            raise ValueError(f'Unknown tool: {tool_name}')

    elif method == 'resources/list':
        return {
            'resources': []
        }

    elif method == 'resources/templates/list':
        return {
            'resourceTemplates': []
        }

    else:
        raise ValueError(f'Unknown method: {method}')

def main():
    """Main loop - read JSON-RPC requests from stdin and respond on stdout"""
    logger.info("Test MCP server starting...")

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue

            try:
                # Parse the JSON-RPC request
                request = json.loads(line)
                logger.info(f"Received request: {request}")

                # Handle the request
                result = handle_request(request)

                # Send the JSON-RPC response
                response = {
                    'jsonrpc': '2.0',
                    'id': request.get('id'),
                    'result': result
                }

                # Write response to stdout
                print(json.dumps(response), flush=True)
                logger.info(f"Sent response: {response}")

            except Exception as e:
                logger.error(f"Error handling request: {e}")
                # Send error response
                error_response = {
                    'jsonrpc': '2.0',
                    'id': request.get('id') if 'request' in locals() else None,
                    'error': {
                        'code': -32603,
                        'message': str(e)
                    }
                }
                print(json.dumps(error_response), flush=True)

    except KeyboardInterrupt:
        logger.info("Test MCP server stopping...")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()