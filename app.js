const fs = require('fs');
const ini = require('ini');
const path = require('path');
const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');
const { Server } = require('socket.io');

const app = express();


function loadConfig() {
    const configPath = path.join(__dirname, 'config.ini');
    if (fs.existsSync(configPath)) {
        const config = ini.parse(fs.readFileSync(configPath, 'utf-8'));
        console.log('__dirname:', __dirname);
        console.log('Porta encontrada:', config.config.PORTA);
        return config.config.PORTA || 3000; // Se PORTA não estiver no config.ini, usar a porta padrão 3000
    }
    return 3000; // Se o arquivo não existir, usa a porta padrão
}

const port = loadConfig();

// Criar servidor HTTP e conectar o Socket.IO
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use('/imgs', express.static(path.join(__dirname, 'imgs')));

// Carregar a sessão salva, se houver
let sessionData;
let contactsCache = [];
const SESSION_FILE_PATH = './whatsapp-session.json';
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}


// Carregar contatos
const contactsFile = './contacts.json';
let selectedContacts = [];
if (fs.existsSync(contactsFile)) {
    selectedContacts = JSON.parse(fs.readFileSync(contactsFile));
}

// Configuração do cliente WhatsApp
const client = new Client({ session: sessionData });
let qrCode = '';
let isConnected = false;
let connectionInfo = {};

// Encaminhar logs para o Socket.IO
function logMessage(message) {
    console.log(message);
    io.emit('log', message); // Envia log para os clientes conectados
}

function loadContactsFromFile() {
    try {
      const data = fs.readFileSync('./contacts.json', 'utf-8');
      return JSON.parse(data); // Retorna a lista de contatos
    } catch (err) {
      console.error('Erro ao ler o arquivo de contatos:', err);
      return [];
    }
  }

// Eventos do WhatsApp
client.on('qr', (qr) => {
    logMessage('QR RECEIVED');
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            logMessage('Error generating QR Code: ' + err);
        } else {
            qrCode = url; // Armazene a URL gerada em Base64
            io.emit('qrCode', qrCode); // Envia o QR Code em tempo real
        }
    });
});

client.on('ready', async () => {
    connectionInfo = await client.info;
    //console.log('0:',connectionInfo);
    logMessage('Cliente Pronto!');
});

async function waitForClientInfo(client, maxRetries = 10, retryInterval = 800) {
    let retries = 0;
    while (retries < maxRetries) {
        const connectionInfo = await client.info; // Tenta obter as informações
        if (connectionInfo) {
            return connectionInfo; // Retorna a informação se disponível
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, retryInterval)); // Aguarda antes de tentar novamente
    }
    throw new Error('Não foi possível obter informações do cliente após várias tentativas.');
}


client.on('authenticated', async (session) => {
    isConnected = true;
    
    try {
        // Aguarda até que `client.info` esteja disponível
        const connectionInfo = await waitForClientInfo(client);
        //console.log('1:',connectionInfo);
        logMessage('Conectado com: ' + (connectionInfo.pushname || connectionInfo.wid.user));
        logMessage('Autenticado com Sucesso!');

        // Salva a sessão no arquivo
        const session = {
            pushname: connectionInfo.pushname || connectionInfo.wid.user,
            wid: connectionInfo.wid
        };
        fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(session));
    } catch (error) {
        console.error('Erro ao autenticar ou salvar a sessão:', error);
    }
});

client.on('disconnected', (reason) => {
    logMessage('Cliente foi desconectado: ' + reason);
    isConnected = false;
    qrCode = ''; // Limpa o QR Code
});

// Inicializa o cliente WhatsApp
client.initialize();

// Rotas
app.get('/', async (req, res) => {
    try {
        if (!isConnected) {
            return res.render('index', { qrCode, isConnected, connectionInfo, contacts: [], selectedContacts });
        }
        const contacts = await client.getContacts();
        res.render('index', { qrCode, isConnected, connectionInfo, contacts, selectedContacts });
    } catch (error) {
        logMessage('Error fetching contacts: ' + error);
        res.status(500).send('Error fetching contacts');
    }
});

app.post('/update-contacts', (req, res) => {
    try {
        selectedContacts = req.body.contacts || [];
        //console.log(selectedContacts);
        fs.writeFileSync(contactsFile, JSON.stringify(selectedContacts, null, 2));
        res.json({ success: true, message: 'Contatos atualizados com sucesso!' });  // Retorna JSON
    } catch (error) {
        logMessage('Error ao atualizar contatos: ' + error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar contatos' });  // Retorna JSON com erro
    }
});

app.post('/send-message', async (req, res) => {
    try {
        const { contacts, messageTemplate } = req.body; // Agora você recebe 'contacts' e 'messageTemplate' da requisição

        // Verifica se existem contatos e se o template da mensagem está presente
        if (!contacts || !contacts.length || !messageTemplate) {
            return res.status(400).json({ success: false, message: 'Contatos ou template de mensagem ausente.' });
        }

        // Envia a mensagem para cada contato
        for (const contactId of contacts) {
            const contact = await client.getContactById(contactId); // Obtém o contato pelo ID
            const customMessage = messageTemplate
                .replace(/{nome}/g, contact.name || 'Amigo') // Substitui {nome} pelo nome do contato
                .replace(/{data}/g, new Date().toLocaleDateString('pt-BR')) // Substitui {data} pela data
                .replace(/{hora}/g, new Date().toLocaleTimeString('pt-BR')); // Substitui {hora} pela hora

            // Envia a mensagem personalizada para o contato
            await client.sendMessage(contactId, customMessage);
            logMessage(`Mensagem enviada para: ${contact.pushname || contactId}`);
        }

        // Retorna uma resposta de sucesso
        res.json({ success: true, message: 'Mensagem(s) enviada(s) com sucesso!' });
    } catch (error) {
        console.error('Erro ao enviar mensagens: ', error);
        res.status(500).json({ success: false, message: 'Erro ao enviar mensagens' });
    }
});

app.get('/contacts', async (req, res) => {
    try {
        const contacts = await client.getContacts();
        const filteredContacts = contacts.filter(contact => contact.pushname);
        // Verifica se o tamanho dos contatos armazenados é diferente do tamanho dos contatos atuais
        //console.log('contactsCache.length', contactsCache.length, "  --contacts.length:", filteredContacts.length);
        if (contactsCache.length !== filteredContacts.length) {
            console.log('O número de contatos mudou. Atualizando a lista...');
            await updateContacts(); // Chama a função de atualização se os tamanhos forem diferentes
        }

        res.json(contactsCache);
    } catch (error) {
        console.error('Erro ao obter contatos:', error);
        res.status(500).json({ error: 'Erro ao obter contatos' });
    }
});


app.get('/contactsCK', (req, res) => {
    const contacts = loadContactsFromFile();
    res.json(contacts); // Envia os IDs de contatos selecionados
  });

app.get('/check-connection', (req, res) => {
    const connectionStatus = {
        isConnected,
        qrCode,
        connectionInfo
    };
    res.json(connectionStatus);
});

// Iniciar servidor com Socket.IO
server.listen(port, () => {
    logMessage(`App is running at http://localhost:${port}`);
});




// Função para atualizar os contatos a cada 1 hora
async function updateContacts() {
    try {
        console.log("Atualizando lista de contatos...");
        contactsCache = [];
        // Obtém os contatos atualizados
        const contacts = await client.getContacts();

        // Filtra apenas os contatos com 'pushname'
        const filteredContacts = contacts.filter(contact => contact.pushname);

        // Adiciona a URL da imagem de perfil para cada contato
        const contactsWithImages = await Promise.all(
            filteredContacts.map(async (contact) => {
                const profilePicUrl = await client.getProfilePicUrl(contact.id._serialized).catch(() => null);
                return {
                    ...contact,
                    displayName: contact.name || contact.pushname || contact.id.user, // Prioriza 'name', depois 'pushname'
                    profilePicUrl: profilePicUrl,
                };
            })
        );

        // Ordena os contatos:
        // 1. Primeiro pela propriedade 'name'
        // 2. Se não tiver 'name', ordena por 'pushname'
        // 3. Se não tiver 'name' nem 'pushname', usa o número (id.user)
        contactsWithImages.sort((a, b) => {
            const aName = a.name || a.pushname || a.id.user;
            const bName = b.name || b.pushname || b.id.user;

            // Se ambos têm 'name', ordena por 'name'
            if (a.name && b.name) {
                return a.name.localeCompare(b.name);
            }
            // Se um tem 'name' e o outro não, coloca o que tem 'name' primeiro
            if (a.name && !b.name) {
                return -1;
            }
            if (!a.name && b.name) {
                return 1;
            }

            // Caso contrário, se não tiver 'name', ordena por 'pushname'
            if (a.pushname && b.pushname) {
                return a.pushname.localeCompare(b.pushname);
            }
            // Se um tem 'pushname' e o outro não, coloca o que tem 'pushname' primeiro
            if (a.pushname && !b.pushname) {
                return -1;
            }
            if (!a.pushname && b.pushname) {
                return 1;
            }

            // Se nenhum tiver 'name' ou 'pushname', ordena por 'id.user'
            return a.id.user.localeCompare(b.id.user);
        });

        // Armazena a lista de contatos no cache
        contactsCache = contactsWithImages;
        console.log("Lista de contatos atualizada com sucesso!");
    } catch (error) {
        console.error('Erro ao atualizar contatos:', error);
    }
}



// Atualiza os contatos a cada 1 hora (3600000 ms)
setInterval(updateContacts, 3600000);


