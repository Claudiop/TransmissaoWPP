; Script Inno Setup para instalar o projeto Node.js
[Setup]
AppName=TransmissaoWPP
AppVersion=1.0
DefaultDirName={pf}\TransmissaoWPP
DefaultGroupName=TransmissaoWPP
OutputDir=./Install/
OutputBaseFilename=Instalador_TransmissaoWPP_Slim
Compression=lzma2
SolidCompression=yes

; Adicionar Fornecedor (Publisher)
AppPublisher=AplicacoesCPH

; Adicionar GUID único para o aplicativo
AppId={{c53568bc-c977-45d1-8371-158335067d4a}}

[Files]
; Inclua todos os arquivos do projeto
Source: ".\app.js"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\service.js"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\config.ini"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\contacts.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\imgs\*"; DestDir: "{app}\imgs"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\node_modules\.bin\*"; DestDir: "{app}\node_modules\.bin"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\node_modules\npm\*"; DestDir: "{app}\node_modules\npm"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\views\*"; DestDir: "{app}\views"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\TransmissaoWPP.url"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Crie atalhos no menu iniciar e para desinstalar
Name: "{group}\TransmissaoWPP"; Filename: "{app}\app.js"; WorkingDir: "{app}"
Name: "{group}\Uninstall"; Filename: "{uninstallexe}"
Name: "{userdesktop}\TransmissaoWPP"; Filename: "{app}\TransmissaoWPP.url"; WorkingDir: "{app}"; IconFilename: "{app}\imgs\favicon.png"; IconIndex: 0

[Run]
; Baixa e instala o Node.js automaticamente, se necessï¿½rio
Filename: "powershell.exe"; Parameters: "-Command Start-Process -FilePath 'msiexec.exe' -ArgumentList '/i https://nodejs.org/dist/v16.20.0/node-v16.20.0-x64.msi /quiet /norestart' -NoNewWindow -Wait"; Flags: shellexec waituntilterminated; Description: "Instalando Node.js..."

; Garante que o Node.js estï¿½ no PATH ou localize dinamicamente
Filename: "powershell.exe"; Parameters: "-Command if (!(Get-Command node.exe -ErrorAction SilentlyContinue)) {{ Write-Host 'Node.js nï¿½o encontrado no PATH!'; Start-Sleep -Seconds 10; Exit 1 }}"; Flags: shellexec waituntilterminated; Description: "Verificando Node.js..."; MinVersion: 0,6.0;

; Instala dependï¿½ncias com npm
Filename: "{app}\node_modules\.bin\npm.cmd"; Parameters: "install"; WorkingDir: "{app}"; Flags: shellexec waituntilterminated; Description: "Instalando dependï¿½ncias..."

; Inicia o serviï¿½o Node.js
Filename: "cmd.exe"; Parameters: "/c node ""{app}\service.js"" && timeout /t 3"; WorkingDir: "{app}"; Flags: shellexec waituntilterminated; Description: "Executando o serviï¿½o..."

