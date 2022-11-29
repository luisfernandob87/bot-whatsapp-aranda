/**
 * ⚡⚡⚡ DECLARAMOS LAS LIBRERIAS y CONSTANTES A USAR! ⚡⚡⚡
 */
require('dotenv').config()
const fs = require('fs');
const express = require('express');
const cors = require('cors')
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const mysqlConnection = require('./config/mysql')
const { middlewareClient } = require('./middleware/client')
const { generateImage, cleanNumber, checkEnvFile, createClient, isValidNumber } = require('./controllers/handle')
const { connectionReady, connectionLost } = require('./controllers/connection')
const { saveMedia } = require('./controllers/save')
const { getMessages, responseMessages, bothResponse } = require('./controllers/flows')
const { sendMedia, sendMessage, lastTrigger, sendMessageButton, readChat } = require('./controllers/send')
const app = express();
const axios = require('axios')
const oracledb = require('oracledb');
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

app.use(cors())
app.use(express.json())
const MULTI_DEVICE = process.env.MULTI_DEVICE || 'true';
const server = require('http').Server(app)

const port = process.env.PORT || 3000
var client;
app.use('/', require('./routes/web'))

let libPath;

libPath = 'C:\\Reclamos\\instantclient_19_15';

if (libPath && fs.existsSync(libPath)) {
    oracledb.initOracleClient({ libDir: libPath });
  }

/**
 * Escuchamos cuando entre un mensaje
 */
const listenMessage = () => client.on('message', async msg => {
    const { from, body, hasMedia } = msg;

    if (!isValidNumber(from)) {
        return
    }



    // Este bug lo reporto Lucas Aldeco Brescia para evitar que se publiquen estados
    if (from === 'status@broadcast') {
        return
    }
    message = body.toLowerCase();
    console.log('BODY', message)
    const number = cleanNumber(from)
    await readChat(number, message)



    //conexion requerimientos
    if (message.startsWith('#')) {
        console.log('Requerimientos', message);
        const ticket = message.slice(1).trim();

async function run() {
    let connection;

    try{
        connection = await oracledb.getConnection({user: "aranda", password: "aranda201", connectString: "192.168.100.69:1522/aranda"});

        const result = await connection.execute(`select  usuarios.uname USUARIO, afw_status.stat_name ESTADO, dbms_lob.substr(asdk_service_call.serv_commentary_nohtml, 4000, 1) SOLUCION, asdk_service_call.serv_expired_date FECHA_ESTIMADA_SOLUCION
        from asdk_service_call 
        inner join afw_status on afw_status.stat_id = asdk_service_call.serv_status_id
        inner join usuarios on usuarios.codusuario = asdk_service_call.serv_customer_id
        where serv_fl_int_project_id = 2
        and serv_id_by_project = ${ticket}`)



        const respuestaBot = result.metaData[0].name + ": " + result.rows[0].USUARIO + "\n" + result.metaData[1].name + ": " + result.rows[0].ESTADO + "\n" + result.metaData[2].name + ": " + result.rows[0].SOLUCION + "\n" + result.metaData[3].name + ": " + result.rows[0].FECHA_ESTIMADA_SOLUCION;

        console.log(respuestaBot);

                
        msg.reply(`${respuestaBot}`)

    }
    catch(err){
        console.error(err);
    }
    finally{
        if (connection) {
            try {
                await connection.close()
            } catch (error) {
                console.log(error);
            }
        }
    }
}
run()


    }
    //conexion incidentes
    if (message.startsWith('*')) {
        console.log('incidentes', message);
        const ticket = message.slice(1)

        async function run() {
            let connection;
        
            try{
                connection = await oracledb.getConnection({user: "aranda", password: "aranda201", connectString: "192.168.100.69:1522/aranda"});
        
                const result = await connection.execute(`select  usuarios.uname USUARIO, afw_status.stat_name ESTADO, dbms_lob.substr(asdk_incident.inci_commentary_nohtml, 4000, 1) SOLUCION, asdk_incident.inci_expired_date FECHA_ESTIMADA_SOLUCION
                from asdk_incident 
                inner join afw_status on afw_status.stat_id = asdk_incident.inci_status_id
                inner join usuarios on usuarios.codusuario = asdk_incident.inci_customer_id
                where inci_fl_int_project_id = 2
                and inci_id_by_project = ${ticket}`)
        
        
        
                const respuestaBot = result.metaData[0].name + ": " + result.rows[0].USUARIO + "\n" + result.metaData[1].name + ": " + result.rows[0].ESTADO + "\n" + result.metaData[2].name + ": " + result.rows[0].SOLUCION + "\n" + result.metaData[3].name + ": " + result.rows[0].FECHA_ESTIMADA_SOLUCION;
        
                console.log(respuestaBot);
        
                        
                msg.reply(`${respuestaBot}`);

        
            }
            catch(err){
                console.error(err);
            }
            finally{
                if (connection) {
                    try {
                        await connection.close()
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        }
        run()



    }
    /**
     * Guardamos el archivo multimedia que envia
     */
    if (process.env.SAVE_MEDIA && hasMedia) {
        const media = await msg.downloadMedia();
        saveMedia(media);
    }

    /**
     * Si estas usando dialogflow solo manejamos una funcion todo es IA
     */

    if (process.env.DATABASE === 'dialogflow') {
        if (!message.length) return;
        const response = await bothResponse(message);
        await sendMessage(client, from, response.replyMessage);
        if (response.media) {
            sendMedia(client, from, response.media);
        }
        return
    }

    /**
    * Ver si viene de un paso anterior
    * Aqui podemos ir agregando más pasos
    * a tu gusto!
    */

    const lastStep = await lastTrigger(from) || null;
    if (lastStep) {
        const response = await responseMessages(lastStep)
        await sendMessage(client, from, response.replyMessage);
    }

    /**
     * Respondemos al primero paso si encuentra palabras clave
     */
    const step = await getMessages(message);

    if (step) {
        const response = await responseMessages(step);

        /**
         * Si quieres enviar botones
         */

        await sendMessage(client, from, response.replyMessage, response.trigger);

        if (response.hasOwnProperty('actions')) {
            const { actions } = response;
            await sendMessageButton(client, from, null, actions);
            return
        }

        if (!response.delay && response.media) {
            sendMedia(client, from, response.media);
        }
        if (response.delay && response.media) {
            setTimeout(() => {
                sendMedia(client, from, response.media);
            }, response.delay)
        }
        return
    }

    //Si quieres tener un mensaje por defecto
    if (process.env.DEFAULT_MESSAGE === 'false') {
        const response = await responseMessages('DEFAULT')
        await sendMessage(client, from, response.replyMessage, response.trigger);

        /**
         * Si quieres enviar botones
         */
        if (response.hasOwnProperty('actions')) {
            const { actions } = response;
            await sendMessageButton(client, from, null, actions);
        }
        return
    }

});



client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', qr => generateImage(qr, () => {
    qrcode.generate(qr, { small: true });

    console.log(`Ver QR http://localhost:${port}/qr`)
    socketEvents.sendQR(qr)
}))

client.on('ready', (a) => {
    connectionReady()
    listenMessage()
    // socketEvents.sendStatus(client)
});

client.on('auth_failure', (e) => {
    // console.log(e)
    // connectionLost()
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.initialize();



/**
 * Verificamos si tienes un gesto de db
 */

if (process.env.DATABASE === 'mysql') {
    mysqlConnection.connect()
}

server.listen(port, () => {
    console.log(`El server esta listo por el puerto ${port}`);
})
checkEnvFile();

