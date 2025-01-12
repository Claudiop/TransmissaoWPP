const path = require('path');
const fs = require('fs');
const ini = require('ini');
const Service = require('node-windows').Service;
const { exec } = require('child_process');

// Função para carregar a configuração do arquivo .ini
function loadConfig() {
    const configPath = path.join(__dirname, 'config.ini');
    if (fs.existsSync(configPath)) {
        const config = ini.parse(fs.readFileSync(configPath, 'utf-8'));
        console.log('__dirname:', __dirname);
        console.log('Porta encontrada:', config);
        return config.PORTA || 3000; // Se PORTA não estiver no config.ini, usar a porta padrão 3000
    }
    return 3000; // Se o arquivo não existir, usa a porta padrão
}

// Função para liberar a porta no firewall
function liberarPorta(porta) {
    const command = `netsh advfirewall firewall add rule name="Node.js Porta ${porta}" protocol=TCP dir=in localport=${porta} action=allow`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro ao liberar a porta: ${stderr}`);
        } else {
            console.log(`Porta ${porta} liberada no firewall.`);
        }
    });
}

// Obtém a porta do arquivo de configuração
const porta = loadConfig();

// Cria um novo serviço
const svc = new Service({
    name: 'TransmisaoWPP',
    description: 'Pagina Web que permite mandar varias mensagens para varios contatos do Qhatsapp na porta: (' + porta + ').',
    script: path.join(__dirname, 'app.js'), // Caminho para o seu arquivo app.js
    env: [{
        name: "PORTA",
        value: porta.toString() // Porta carregada do arquivo .ini
    }],
    nodeOptions: ['--harmony'] // Caso precise de alguma flag adicional do Node.js
});

svc.on('install', function () {
    liberarPorta(porta);
    svc.start(); // Inicia o serviço após a instalação
});

// Instalar o serviço com inicialização automática
svc.on('uninstall', function () {
    console.log('O serviço foi desinstalado!');
});

// Instalar o serviço e configurá-lo para inicializar automaticamente
svc.install();

// Configura o serviço para iniciar automaticamente
svc.on('start', function () {
    console.log('O serviço foi iniciado!');
});
