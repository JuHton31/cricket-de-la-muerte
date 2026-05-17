@echo off
echo Telechargement des fonts pour Cricket de la Muerte...

REM Creer le dossier fonts s'il n'existe pas
if not exist "fonts" mkdir fonts

REM Telecharger Rye
echo Telechargement de Rye...
curl -L -o "fonts/rye.ttf" "https://fonts.gstatic.com/s/rye/v17/r05XGLJT86YDFg.ttf"

REM Telecharger Special Elite
echo Telechargement de Special Elite...
curl -L -o "fonts/special-elite.ttf" "https://fonts.gstatic.com/s/specialelite/v20/XLYgIZbkc4JPUL5CVArUVL0nhnc.ttf"

echo.
echo Telechargement termine!
echo Les fonts sont dans le dossier 'fonts/'
pause
