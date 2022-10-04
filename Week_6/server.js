require('dotenv/config')

const exp = require('express')
const multer = require('multer')
const AWS = require('aws-sdk')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

// aws config
AWS.config = new AWS.Config({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION
})

// S3
const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
})

const app = exp()
const port = process.env.PORT
const productTable = 'Product'
const awsClient = new AWS.DynamoDB.DocumentClient()

// express config
app.use(exp.static('./templates'))
app.set('view engine', 'ejs')
app.set('views', './templates')

// upload file config - make sure file is image type
const storage = multer.memoryStorage({
    destination(req, file, callback) {
        callback(null, '')
    }
})

function checkFileType(file, callback) {
    const fileTypes = /jpeg|jpg|png/

    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase())
    const minetype = fileTypes.test(file.mimetype)

    if (extname && minetype)
        return callback(null, true)

    return callback('Error: Image Only')
}

const upload = multer({
    storage,
    limits: { fileSize: 2000000 },
    fileFilter(req, file, callback) {
        checkFileType(file, callback)
    }
})

app.post('/add_product', upload.single('image'), (req, res) => {

    const { id, name, quantity } = req.body
    const image = req.file.originalname.split('.')

    const fileType = image[image.length - 1]
    const filePath = `${uuidv4() + Date.now().toString()}.${fileType}` //  ex: a-e-g12345.png

    const params = {
        Bucket: process.env.BUCKET,
        Key: filePath,
        Body: req.file.buffer
    }

    s3.upload(params, (err, data) => {
        if (err)
            res.send(err)
        else {
            const newItemParams = {
                TableName: productTable,
                Item: {
                    'id': id,
                    'name': name,
                    'quantity': quantity,
                    'image': `${process.env.CLOUND_FRONT_URL}/${filePath}`
                }
            }

            awsClient.put(newItemParams, (error, data) => {
                if (error)
                    res.send(err)
                else
                    res.redirect('/')
            })
        }
    })
})

app.get('/', (req, res) => {
    let params = {
        TableName: productTable
    }

    awsClient.scan(params, (error, data) => {
        if (error)
            res.send(err)
        else
            res.render('index', { products: data.Items })
    })
})

app.get('/update', (req, res) => {

    const id = req.query.id

    let params = {
        TableName: productTable,
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': id }
    }

    awsClient.query(params, (error, data) => {
        if (error)
            res.send(err)
        else
            res.render('update', { product: data.Items[0] })
    })
})

app.post('/update_product', upload.single('image'), (req, res) => {
    const { id, name, quantity } = req.body
    let image = []

    if (typeof req.file != 'undefined')
        image = req.file.originalname.split('.')

    if (image.length != 0) {

        const fileType = image[image.length - 1]
        const filePath = `${uuidv4() + Date.now().toString()}.${fileType}` //  ex: a-e-g12345.png

        const params = {
            Bucket: process.env.BUCKET,
            Key: filePath,
            Body: req.file.buffer
        }

        s3.upload(params, (err, data) => {
            if (err)
                res.send(err)
            else {
                const updateParams = {
                    TableName: productTable,
                    Key: {
                        'id': id
                    },
                    UpdateExpression: 'set #first = :newName, #second = :newQuan, #third = :newImage',
                    ExpressionAttributeNames: {
                        '#first': 'name',
                        '#second': "quantity",
                        '#third': 'image'
                    },
                    ExpressionAttributeValues: {
                        ':newName': name,
                        ':newQuan': quantity,
                        ':newImage': `${process.env.CLOUND_FRONT_URL}/${filePath}`
                    }
                }

                awsClient.update(updateParams, (error, data) => {
                    if (error)
                        res.send(err)
                    else
                        res.redirect('/')
                })
            }
        })
    }
    else {
        const updateParams = {
            TableName: productTable,
            Key: {
                'id': id
            },
            UpdateExpression: 'set #first = :newName, #second = :newQuan',
            ExpressionAttributeNames: {
                '#first': 'name',
                '#second': "quantity"
            },
            ExpressionAttributeValues: {
                ':newName': name,
                ':newQuan': quantity
            }
        }

        awsClient.update(updateParams, (error, data) => {
            if (error)
                res.send(err)
            else
                res.redirect('/')
        })
    }
})

app.get('/delete', (req, res) => {
    const id = req.query.id

    const params = {
        TableName: productTable,
        Key: {
            'id': id
        }
    }

    awsClient.delete(params, (err, data) => {
        if (error)
            res.send(err)
        else
            res.redirect('/')
    })
})

app.listen(port, () => console.log(`App running on port: ${port}`))