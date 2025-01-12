; Script Inno Setup para instalar o projeto Node.js
[Setup]
AppName=TransmissaoWPP
AppVersion=1.0
DefaultDirName={pf}\TransmissaoWPP
DefaultGroupName=TransmissaoWPP
OutputDir=.
OutputBaseFilename=Instalador_TransmissaoWPP
Compression=lzma2
SolidCompression=yes

[Files]
; Inclua todos os arquivos do projeto
Source: "*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Cria um atalho para iniciar o serviço
Name: "{group}\Iniciar Serviço"; Filename: "{app}\service.js"
; Opcional: Crie um atalho para desinstalar
Name: "{group}\Uninstall"; Filename: "{uninstallexe}"

[Run]
; Baixa e instala o Node.js automaticamente, se necessário
Filename: "powershell.exe"; Parameters: "-Command ""Start-Process -FilePath 'msiexec.exe' -ArgumentList '/i https://nodejs.org/dist/v16.20.0/node-v16.20.0-x64.msi /quiet /norestart' -Wait"""
; Instala dependências com npm
Filename: "{app}\node_modules\npm\bin\npm-cli.js"; Parameters: "install"; WorkingDir: "{app}"
; Inicia o serviço
Filename: "node"; Parameters: "{app}\service.js"; WorkingDir: "{app}"; Flags: shellexec runhidden
