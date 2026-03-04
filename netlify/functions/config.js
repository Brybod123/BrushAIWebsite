exports.handler = async (event) => {
    try {
        const config = {
            apiKey: process.env.apiKey,
            authDomain: process.env.authDomain,
            databaseURL: process.env.databaseURL,
            projectId: process.env.projectId,
            storageBucket: process.env.storageBucket,
            messagingSenderId: process.env.messagingSenderId,
            appId: process.env.appId,
            measurementId: process.env.measurementId
        };

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        };
    } catch (error) {
        return { statusCode: 500, body: 'Config Sync Error' };
    }
};
