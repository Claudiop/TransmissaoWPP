; Script Inno Setup para instalar o projeto Node.js
[Setup]
AppName=TransmissaoWPP
AppVersion=1.0
DefaultDirName={pf}\TransmissaoWPP
DefaultGroupName=TransmissaoWPP
OutputDir=./Setup/
OutputBaseFilename=Instalador_TransmissaoWPP
Compression=lzma2
SolidCompression=yes

[Files]
; Inclua todos os arquivos do projeto
Source: ".\app.js"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\service.js"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\config.ini"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\contacts.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\imgs\*"; DestDir: "{app}\imgs"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\views\*"; DestDir: "{app}\views"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Crie atalhos no menu iniciar e para desinstalar
Name: "{group}\TransmissaoWPP"; Filename: "{app}\app.js"; WorkingDir: "{app}"
Name: "{group}\Uninstall"; Filename: "{uninstallexe}"

[Run]
; Baixa e instala o Node.js automaticamente, se necessário
Filename: "powershell.exe"; Parameters: "-Command ""Start-Process -FilePath 'msiexec.exe' -ArgumentList '/i https://nodejs.org/dist/v16.20.0/node-v16.20.0-x64.msi /quiet /norestart' -Wait"""; Flags: shellexec; Description: "Instalando Node.js..."

; Garante que o Node.js está no PATH ou localize dinamicamente
Filename: "powershell.exe"; Parameters: "-Command if (!(Get-Command node.exe -ErrorAction SilentlyContinue)) {{ Write-Host 'Node.js não encontrado no PATH!'; Start-Sleep -Seconds 10; Exit 1 }}"; Flags: shellexec waituntilterminated; Description: "Verificando Node.js..."
; Instala dependências com npm
Filename: "{app}\node_modules\.bin\npm.cmd"; Parameters: "install"; WorkingDir: "{app}"; Flags: shellexec waituntilterminated

; Inicia o serviço Node.js
Filename: "powershell.exe"; Parameters: "-Command Start-Process -FilePath 'node' -ArgumentList '{app}\service.js' -Wait; Start-Sleep -Seconds 10"; WorkingDir: "{app}"; Flags: shellexec waituntilterminated; Description: "Executando o serviço..."
