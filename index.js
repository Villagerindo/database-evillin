const express = require('express')
const https = require('https')
const app = express()
const fs = require('fs')
const { EventEmitter } = require('events')
const dbPath = './db.json'
const chalk = require("chalk")

class Stater extends EventEmitter {
        constructor(props) {
                super(props)
                this.state = true
        }

        setState(newState) {
                this.state = newState || false
                this.emit('set', newState)
        }

        waitForTrue(newState) {
                return new Promise(resolve => {
                        let check = () => {
                                if (this.state) {
                                        this.off('set', check)
                                        resolve()
                                }
                        }
                        this.on('set', check)
                        check()
                })
        }
}

const isOpen = new Stater

const allowOnlyIp = (req, res, next) => {
        const allowedIp = ["::ffff:167.172.86.224", "::ffff:157.230.46.56"]
        const userIp = req.ip
        const infoIp = userIp.replace("::ffff:", "")
        console.log(chalk.red("[!]") + chalk.yellow("Ip berikut telah mengakses website Anda!: ") + chalk.white(infoIp))
        if (allowedIp.includes(userIp)) {
                next()
        } else {
                res.status(403).send("Forbidden")
        }
}

app.use(allowOnlyIp)
app.get('/', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        await isOpen.waitForTrue()
        isOpen.setState(false)
        fs.createReadStream(dbPath).pipe(res)
        isOpen.setState(true)
})

app.post('/', async (req, res) => {
        if (req.headers['Content-Type'] === 'application/json') return res.status(401).json({
                error: 'Invalid Type',
                message: 'Content-Type must be application/json'
        })
        await isOpen.waitForTrue()
        isOpen.setState(false)
        req.pipe(fs.createWriteStream(dbPath))
        isOpen.setState(true)
})

const options = {
        key: fs.readFileSync("./key.pem", "utf8"),
        cert: fs.readFileSync("./cert.crt", "utf8")
}
https.createServer(options, app).listen(80)
// app.listen(80, () => {
// console.log("Website telah dijalankan...")
// })
