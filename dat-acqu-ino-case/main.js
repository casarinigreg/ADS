// importa os bibliotecas necessários
const serialport = require('serialport');
const express = require('express');
const mysql = require('mysql2');

// constantes para configurações
const SERIAL_BAUD_RATE = 9600;
const SERVIDOR_PORTA = 3300;

// habilita ou desabilita a inserção de dados no banco de dados
const HABILITAR_OPERACAO_INSERIR = true;

// habilita ou desabilita o modo simulado
// true: gera dados falsos, sem precisar do Arduino (modo treino)
// false: lê os dados reais do Arduino pela porta serial
const HABILITAR_SENSORES_SIMULADOS = true;

// função para comunicação serial
const serial = async (
    valoresLm35,
    valoresTcrt5000
) => {

    // conexão com o banco de dados MySQL
    let poolBancoDados = mysql.createPool(
        {
            host: 'localhost',
            user: 'user_insert',
            password: 'senhadata',
            database: 'dataqui',
            port: 3306
        }
    ).promise();

    // trata uma linha no formato "digital;analogico", vinda do Arduino ou do simulador
    const tratarLinha = async (data) => {
        console.log(data);
        const valores = data.split(';');
        const lm35 = parseFloat(valores[1]);
        const tcrt5000 = parseInt(valores[0]);
        // armazena os valores dos sensores nos arrays correspondentes
       
        valoresTcrt5000.push(tcrt5000);
        valoresLm35.push(lm35);
        // insere os dados no banco de dados (se habilitado)
        if (HABILITAR_OPERACAO_INSERIR) {

            const ACRESCIMO_SALA2 = (lm35 + 10);
            const ACRESCIMO_SALA3 = (lm35 + 20);
            

            await poolBancoDados.execute('INSERT INTO medida (lm35_temp, chave, fk_sala) VALUES (?, ?, 1)',
                [lm35, tcrt5000]
            );
            console.log(`valores inseridos no banco:  ${lm35.toFixed(2)}, ${tcrt5000} - Sala 1`);

            await poolBancoDados.execute('INSERT INTO medida (lm35_temp, chave, fk_sala) VALUES (?, ?, 2)',
                 [ACRESCIMO_SALA2, tcrt5000]
             );
             console.log(`valores inseridos no banco:  ${ACRESCIMO_SALA2.toFixed(2)}, ${tcrt5000} - Sala 2`);

             await poolBancoDados.execute('INSERT INTO medida (lm35_temp, chave, fk_sala) VALUES (?, ?, 3)',
                 [ACRESCIMO_SALA3, tcrt5000]
             );
             console.log(`valores inseridos no banco:  ${ACRESCIMO_SALA3.toFixed(2)}, ${tcrt5000} - Sala 3`);
            // TODO (Etapa 3): escreva aqui o INSERT na tabela "medida"

            // lembre: o campo "momento" é preenchido pelo banco, não pelo main.js

        }
        

    };

    // modo simulado: gera uma linha por segundo, no mesmo formato que o Arduino envia
    if (HABILITAR_SENSORES_SIMULADOS) {
        console.log('*** MODO SIMULADO: os dados são falsos, o Arduino NÃO está sendo lido ***');
        setInterval(() => {
            const digital = Math.round(Math.random());              // 0 ou 1
            const analogico = (18 + Math.random() * 4).toFixed(2);  // 18.00 a 21.99
            tratarLinha(`${digital};${analogico}`);
        }, 1000);
        return;
    }

    // lista as portas seriais disponíveis e procura pelo Arduino
    const portas = await serialport.SerialPort.list();
    const portaArduino = portas.find((porta) => porta.vendorId == 2341 && porta.productId == 43);
    if (!portaArduino) {
        throw new Error('O arduino não foi encontrado em nenhuma porta serial');
    }

    // configura a porta serial com o baud rate especificado
    const arduino = new serialport.SerialPort(
        {
            path: portaArduino.path,
            baudRate: SERIAL_BAUD_RATE
        }
    );

    // evento quando a porta serial é aberta
    arduino.on('open', () => {
        console.log(`A leitura do arduino foi iniciada na porta ${portaArduino.path} utilizando Baud Rate de ${SERIAL_BAUD_RATE}`);
    });

    // processa os dados recebidos do Arduino
    arduino.pipe(new serialport.ReadlineParser({ delimiter: '\r\n' })).on('data', tratarLinha);

    // evento para lidar com erros na comunicação serial
    arduino.on('error', (mensagem) => {
        console.error(`Erro no arduino (Mensagem: ${mensagem}`)
    });
}

// função para criar e configurar o servidor web
const servidor = (    
    valoresTcrt5000,
    valoresLm35
) => {
    const app = express();

    // configurações de requisição e resposta
    app.use((request, response, next) => {
        response.header('Access-Control-Allow-Origin', '*');
        response.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
        next();
    });

    // inicia o servidor na porta especificada
    app.listen(SERVIDOR_PORTA, () => {
        console.log(`API executada com sucesso na porta ${SERVIDOR_PORTA}`);
    });

    // define os endpoints da API para cada tipo de sensor
    app.get('/sensores/lm35', (_, response) => {
        return response.json(valoresLm35);
    });
    app.get('/sensores/tcrt5000', (_, response) => {
        return response.json(valoresTcrt5000);
    });
}

// função principal assíncrona para iniciar a comunicação serial e o servidor web
(async () => {
    // arrays para armazenar os valores dos sensores
    const valoresLm35 = [];
    const valoresTcrt5000 = [];

    // inicia a comunicação serial
    await serial(
        valoresLm35,
        valoresTcrt5000
    );

    // inicia o servidor web
    servidor(
        valoresLm35,
        valoresTcrt5000
    );
})();
