const { handler, simpleHash, selectBackend } = require("./handler");
const config = require("./config");

describe("CloudFront routing", () => {

    test("sempre retorna uma backend válido", () => {
        const mockRequest = {
            clientIp: "1.1.1.1",
            uri: "/test",
            origin: {
                custom: {
                    domainName: ""
                }
            }
        };

        // Mock cf object com updateRequestOrigin
        global.cf = {
            request: mockRequest,
            updateRequestOrigin: jest.fn((config) => {
                mockRequest.origin.custom.domainName = config.domainName;
            })
        };

        const result = handler({});

        expect(global.cf.updateRequestOrigin).toHaveBeenCalled();
        expect(result.origin).toBeDefined();
        expect(result.origin.custom).toBeDefined();
        expect(result.origin.custom.domainName).toMatch(/aws|onprem/);
    });

    test("determinismo: mesmo timestamp gera mesma saída", () => {
        const timestamp = 1234567890;
        
        // Mock Date.now para retornar o mesmo valor
        const originalNow = Date.now;
        Date.now = jest.fn(() => timestamp);

        const backend1 = selectBackend();
        const backend2 = selectBackend();

        Date.now = originalNow;

        expect(backend1).toBe(backend2);
    });

    test("hash é determinístico", () => {
        const key = "test-key";

        const hash1 = simpleHash(key);
        const hash2 = simpleHash(key);

        expect(hash1).toBe(hash2);
    });

    test("distribuição aproximada conforme config", () => {
        const TOTAL = 10000;
        const AWS_THRESHOLD = config.distribution.aws;

        let aws = 0;
        let onprem = 0;

        // Mock Date.now para variar o timestamp em cada iteração
        const originalNow = Date.now;
        Date.now = jest.fn(() => 0);

        for (let i = 0; i < TOTAL; i++) {
            Date.now.mockReturnValue(1000 + i);
            const backend = selectBackend();

            if (backend === "aws") {
                aws++;
            } else {
                onprem++;
            }
        }

        Date.now = originalNow;

        const awsRatio = aws / TOTAL;
        const onpremRatio = onprem / TOTAL;
        const expectedAwsRatio = AWS_THRESHOLD / 100;

        // tolerância estatística
        expect(awsRatio).toBeGreaterThan(expectedAwsRatio - 0.02);
        expect(awsRatio).toBeLessThan(expectedAwsRatio + 0.02);

        expect(onpremRatio).toBeGreaterThan(1 - expectedAwsRatio - 0.02);
        expect(onpremRatio).toBeLessThan(1 - expectedAwsRatio + 0.02);
    });

    test("stateless: chamadas independentes com timestamps diferentes", () => {
        const originalNow = Date.now;
        
        Date.now = jest.fn(() => 1000);
        const backend1 = selectBackend();
        
        Date.now = jest.fn(() => 2000);
        const backend2 = selectBackend();
        
        Date.now = jest.fn(() => 1000);
        const backend3 = selectBackend();

        Date.now = originalNow;

        expect(backend1).toBe(backend3); // mesmo timestamp gera mesmo resultado
        expect(backend1).not.toBeUndefined();
        expect(backend2).not.toBeUndefined();
    });
});