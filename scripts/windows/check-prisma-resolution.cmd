@echo off
echo === Checking Prisma Environment Resolution ===
echo.

echo [1] Show all environment variables Prisma might use...
set | findstr DATABASE
set | findstr POSTGRES
echo.

echo [2] Check if there's a .env in parent directories...
cd ..
if exist .env (
    echo WARNING: Found .env in parent directory!
    echo Content:
    type .env
)
cd manufacturing-analytics-platform

echo.
echo [3] Check Prisma schema for hardcoded values...
type prisma\schema.prisma | findstr -n "localhost"
type prisma\schema.prisma | findstr -n "5432"

echo.
echo [4] Force Prisma to show what it's using...
echo Creating minimal test...
mkdir test-prisma 2>nul
cd test-prisma
echo datasource db { > schema.prisma
echo   provider = "postgresql" >> schema.prisma
echo   url      = env("DATABASE_URL") >> schema.prisma
echo } >> schema.prisma

echo DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/manufacturing" > .env

echo.
echo Testing with minimal setup...
npx prisma db pull

cd ..
rmdir /s /q test-prisma

echo.
pause