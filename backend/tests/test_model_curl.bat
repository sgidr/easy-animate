@echo off
REM 模型配置API测试脚本 (Windows CMD)

echo ============================================================
echo 模型配置API测试
echo ============================================================

REM 1. 登录获取token
echo.
echo 1. 获取管理员token...
for /f "tokens=*" %%i in ('curl -s -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}" ^
  ^| findstr /R "access_token"') do set TOKEN_LINE=%%i

echo %TOKEN_LINE%

REM 提取token (简单方法)
for /f "tokens=2 delims=:," %%i in ('echo %TOKEN_LINE%') do set TOKEN=%%i
set TOKEN=%TOKEN:"=%
set TOKEN=%TOKEN: =%

echo Token: %TOKEN%

REM 2. 获取模型列表
echo.
echo 2. 获取模型列表...
curl -s -X GET http://localhost:5000/api/admin/models ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" | findstr /V "^$"

REM 3. 切换模型
echo.
echo 3. 切换模型到 Gemini 3 Flash...
curl -s -X PUT http://localhost:5000/api/admin/models/current ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"model_id\":\"gemini-3-flash-preview\"}" | findstr /V "^$"

REM 4. 验证切换
echo.
echo 4. 验证模型切换...
curl -s -X GET http://localhost:5000/api/admin/models ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" | findstr /V "^$"

echo.
echo ============================================================
echo 测试完成
echo ============================================================
