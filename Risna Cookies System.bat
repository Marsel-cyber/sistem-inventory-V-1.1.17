@echo off 
echo Menjalankan server System . . . 
start "" cmd /k "npm run dev"

timeout /t 4 >nul 

echo Membuka Aplikasi . . .
start chrome http://localhost:5173