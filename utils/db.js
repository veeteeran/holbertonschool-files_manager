const MongoClient = require('mongodb').MongoClient;
class DBCLient {
    constructor() {
        const localHost = process.env.DB_HOST || 'localhost'
        const port = process.env.DB_PORT || 27017
        const database = process.env.DB_DATABASE || 'files_manager'
        const url = `mongodb://${localHost}:${port}`
        this.client =  new MongoClient(url, { useUnifiedTopology: true });
        this.client.connect((err) => {
            this.db = this.client.db(database)
        })
    }
    isAlive() {
        return this.client.isConnected()
    }
    async nbUsers() {
        return this.db.collection('users').countDocuments({})
    }
    async nbFiles() {
        return this.db.collection('files').countDocuments({})
    }

}

const dbClient = new DBCLient();
module.exports = dbClient
