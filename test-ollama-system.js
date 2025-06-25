#!/usr/bin/env node

// Simple system test for the Ollama-based manufacturing analytics platform

const fetch = require('node-fetch');

async function testSystem() {
    console.log('🧪 Testing Manufacturing Analytics Platform with Ollama\n');
    
    const tests = [
        {
            name: 'Database Connection',
            test: async () => {
                // Test if we can connect to the database on the new port
                const { exec } = require('child_process');
                return new Promise((resolve, reject) => {
                    exec('docker exec manufacturing-postgres pg_isready -U analytics -d manufacturing', 
                         (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve(stdout.includes('accepting connections'));
                    });
                });
            }
        },
        {
            name: 'Redis Connection',
            test: async () => {
                const { exec } = require('child_process');
                return new Promise((resolve, reject) => {
                    exec('docker exec manufacturing-redis redis-cli ping', 
                         (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve(stdout.trim() === 'PONG');
                    });
                });
            }
        },
        {
            name: 'Ollama Service',
            test: async () => {
                try {
                    const response = await fetch('http://localhost:11434/api/version');
                    const data = await response.json();
                    return data.version !== undefined;
                } catch (error) {
                    return false;
                }
            }
        },
        {
            name: 'Ollama Models Available',
            test: async () => {
                try {
                    const response = await fetch('http://localhost:11434/api/tags');
                    const data = await response.json();
                    return data.models && data.models.length > 0;
                } catch (error) {
                    return false;
                }
            }
        },
        {
            name: 'Ollama Query Test',
            test: async () => {
                try {
                    const response = await fetch('http://localhost:11434/api/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'gemma:2b',
                            prompt: 'What is OEE in manufacturing?',
                            stream: false
                        })
                    });
                    const data = await response.json();
                    return data.response && data.response.length > 0;
                } catch (error) {
                    return false;
                }
            }
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        process.stdout.write(`Testing ${test.name}... `);
        
        try {
            const result = await test.test();
            if (result) {
                console.log('✅ PASS');
                passed++;
            } else {
                console.log('❌ FAIL');
                failed++;
            }
        } catch (error) {
            console.log(`❌ FAIL (${error.message})`);
            failed++;
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed! The Ollama system is ready.');
        console.log('\nQuick Start:');
        console.log('1. Database: postgresql://analytics:development_password@localhost:5433/manufacturing');
        console.log('2. Ollama API: http://localhost:11434');
        console.log('3. Available models:', await getAvailableModels());
        console.log('\nTry a query:');
        console.log('curl -X POST http://localhost:11434/api/generate \\');
        console.log('  -d \'{"model": "gemma:2b", "prompt": "Calculate OEE", "stream": false}\'');
    } else {
        console.log('\n⚠️  Some tests failed. Check the services and try again.');
        process.exit(1);
    }
}

async function getAvailableModels() {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        const data = await response.json();
        return data.models.map(m => m.name).join(', ');
    } catch (error) {
        return 'Unable to fetch models';
    }
}

testSystem().catch(console.error);