module.exports = {
    // Distribuição de tráfego (em percentual)
    distribution: {
        aws: 5,
    },

    // URLs dos backends
    backends: {
        aws: "https://aws-backend.example.com:443",
        onprem: "https://onprem.example.com:443",
    },
};
