require('dotenv/config')

const exp = require('express')
const multer = require('multer')
const AWS = require('aws-sdk')
const { parse } = require('dotenv')

AWS.config = new AWS.Config({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION
})

const app = exp()
const upload = multer()
const port = process.env.PORT
const productTable = 'SanPham'
const awsClient = new AWS.DynamoDB.DocumentClient()

app.use(exp.static('./templates'))
app.set('view engine', 'ejs')
app.set('views', './templates')

let tempProductList = []

app.get('/', (req, res) => {

    let params = {
        TableName: productTable
    }

    awsClient.scan(params, (error, data) => {
        if (error)
            res.render('index', { err: error, products: tempProductList })
        else {

            tempProductList = data.Items.sort(
                (firstProduct, secondProduct) => firstProduct['id'] - secondProduct['id']) //ascending order by product id

            res.render('index', {
                products: tempProductList
            })
        }
    })
})

app.post('/add_product', upload.fields([]), (req, res) => {

    let params = {
        TableName: productTable,
        Item: {
            'id': parseInt(req.body.id),
            'name': req.body.name,
            'quantity': parseInt(req.body.quantity)
        }
    }

    awsClient.put(params, (error, data) => {
        if (error)
            res.render('index', { err: error, products: tempProductList })
        else
            res.redirect('/')
    })
})

app.get('/update', (req, res) => {

    let productID = parseInt(req.query.pid)

    if (tempProductList.findIndex(product => product['id'] == productID) == -1)
        res.render('index', { err: `Can't find product with id = ${productID}`, products: tempProductList })

    let params = {
        TableName: productTable,
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
            ':id': productID
        }
    }

    awsClient.query(params, (error, data) => {
        if (error)
            res.render('index', { err: error, products: tempProductList })
        else
            res.render('update', { product: data.Items[0] })
    })
})

app.post('/update_product', upload.fields([]), (req, res) => {

    let id = parseInt(req.body.id)
    let name = req.body.name
    let quantity = parseInt(req.body.quantity)

    let params = {
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

    awsClient.update(params, (error, data) => {
        if (error)
            res.render('index', { err: error, products: tempProductList })
        else
            res.redirect('/')
    })
})

app.get('/delete', (req, res) => {

    let productID = parseInt(req.query.pid)

    if (tempProductList.findIndex(product => product['id'] == productID) == -1)
        res.render('index', { err: `Can't find product with id = ${productID}`, products: tempProductList })

    let params = {
        TableName: productTable,
        Key: {
            'id': productID
        }
    }

    awsClient.delete(params, (error, data) => {
        if (error)
            res.render('index', { err: error, products: tempProductList })
        else
            res.redirect('/')
    })
})

app.listen(port, () => console.log(`Listening at port: ${port}`))