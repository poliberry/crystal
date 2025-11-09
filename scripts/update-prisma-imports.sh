#!/bin/bash

# Function to replace Prisma imports in a file
update_file() {
    local file=$1
    sed -i '' 's/from "@prisma\/client"/from "@\/types\/conversation"/g' "$file"
}

# Update all component files
find /Users/user/Documents/GitHub/crystal/components -name "*.tsx" -exec bash -c 'update_file "$0"' {} \;