#!/bin/bash

echo "Testing Next.js build..."
echo "========================"

# Set environment to production for build
export NODE_ENV=production

# Clear any previous build
rm -rf .next

# Run the build
npm run build 2>&1 | tee build-output.log

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    exit 0
else
    echo "❌ Build failed. Check build-output.log for details."
    
    # Extract error summary
    echo ""
    echo "Error Summary:"
    echo "--------------"
    grep -E "Error:|Failed|error|ERROR" build-output.log | tail -20
    
    exit 1
fi