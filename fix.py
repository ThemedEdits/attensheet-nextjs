import os, glob

files = glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True)
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('import prisma from "@/lib/prisma"', 'import { prisma } from "@/lib/prisma"')
    new_content = new_content.replace("import prisma from '@/lib/prisma'", 'import { prisma } from "@/lib/prisma"')
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
