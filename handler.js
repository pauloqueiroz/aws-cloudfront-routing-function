const config = require("./config");

function getCf() {
    return global.cf || require("cloudfront");
}

/**
 * Calcula um hash determinístico para uma string
 * @param {string} str - String a ser hasheada
 * @returns {number} Hash numérico
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash);
}

/**
 * Seleciona o backend baseado no timestamp da requisição
 * Utiliza distribuição configurada de tráfego
 * @returns {string} Nome do backend ('aws' ou 'onprem')
 */
function selectBackend() {
    const timestamp = Date.now();
    const hash = simpleHash(String(timestamp));
    const bucket = hash % 100;
    const awsThreshold = config.distribution.aws;

    return bucket < awsThreshold ? "aws" : "onprem";
}

/**
 * Atualiza a origin da requisição com o backend selecionado
 * Utiliza o utilitário CloudFront para configurar a origem
 */
function updateOriginForRequest() {
    const selectedBackend = selectBackend();
    const backendUrl = config.backends[selectedBackend];
    const cf = getCf();

    cf.updateRequestOrigin({
        domainName: backendUrl,
    });
}

/**
 * Handler principal da função CloudFront
 * Processa a requisição e atualiza a origin de acordo com a distribuição configurada
 * @param {Object} event - Evento da requisição do CloudFront
 * @returns {Object} Requisição com origin atualizado
 */
function handler(event) {
    updateOriginForRequest();

    return getCf().request;
}

module.exports = { handler, simpleHash, selectBackend };