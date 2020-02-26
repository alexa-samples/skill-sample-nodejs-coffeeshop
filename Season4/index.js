// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');

const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {

        const attributesManager = handlerInput.attributesManager;
        const lastOrder = await attributesManager.getPersistentAttributes() || {};
        console.log('lastOrder is: ', lastOrder);

        const menu = lastOrder.hasOwnProperty('menu') ? lastOrder.menu : undefined;
        const amount = lastOrder.hasOwnProperty('amount') ? lastOrder.amount : undefined;

        let speakOutput = 'コーヒーショップへようこそ。今日は何にしますか？';
        if (menu && amount) {
            speakOutput = `コーヒーショップへようこそ。前回は${menu}を${amount}つでしたね？今日は何にしますか？`;
        }
        const reprompt = '今日は何にしますか？';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(reprompt)
            .getResponse();
    }
};
const OrderIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'OrderIntent';
    },
    async handle(handlerInput) {

        const attributesManager = handlerInput.attributesManager;

        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const slots = handlerInput.requestEnvelope.request.intent.slots;

        let lastOrder = await attributesManager.getPersistentAttributes() || {};
        console.log('lastOrder is: ', lastOrder);

        const menuS3 = lastOrder.hasOwnProperty('menu') ? lastOrder.menu : undefined;
        const amountS3 = lastOrder.hasOwnProperty('amount') ? lastOrder.amount : undefined;

        let menu = slots.menu.value || attributes.menu || menuS3;
        let amount = slots.amount.value || attributes.amount || amountS3;

        /*
        if(slots.menu.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH'){
            menu = slot.menu.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        }
        */

        /*
        if(slots.menu.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH'){
            menu = slot.menu.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        }
        */

        if (menu === undefined) {
            attributes.amount = amount;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            const speechOutput = '何を注文しますか？';
            const reprompt = '何を注文しますか？';
            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(reprompt)
                .getResponse();
        }

        if (menu !== undefined && amount === undefined) {
            attributes.menu = menu;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            const speechOutput = 'おいくつ注文しますか？';
            const reprompt = 'おいくつ注文しますか？';
            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(reprompt)
                .getResponse();
        }

        lastOrder = { "menu": menu, "amount": amount };
        attributesManager.setPersistentAttributes(lastOrder);
        await attributesManager.savePersistentAttributes();

        const speechOutput = `${menu}を${amount}つですね。ありがとうございます。`;
        return handlerInput.responseBuilder
            .speak(speechOutput)
            .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'コーヒーをご注文いただけます。今日は何にしますか？';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'またね!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `すみません。ちょっとうまくいかないようです。もう一度言ってください。`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        OrderIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({ bucketName: process.env.S3_PERSISTENCE_BUCKET })
    )
    .lambda();
