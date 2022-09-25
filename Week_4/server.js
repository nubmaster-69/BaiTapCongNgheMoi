require('dotenv/config')

const exp = require('express')
const app = exp()
const multer = require('multer')
const upload = multer()
const port = process.env.PORT

// Config ExpressJs
app.use(exp.static('./templates'))
app.set('view engine', 'ejs')
app.set('views', './templates')

let products = require('./local_data_store').products

app.get('/', (req, res) => {
    res.render('index', { products: products.sort((first, second) => first - second) })
})

app.post('/add_product', upload.fields([]), (req, res) => {
    const { id, name, quantity } = req.body

    if (products.findIndex(product => product.id == id) != -1)
        id = new Date().getTime() + 1;

    products.push({
        'id': id,
        'name': name,
        'quantity': quantity
    })

    res.redirect('/')
})

///delete?productID=1
app.get('/delete', (req, res) => {
    let productID = parseInt(req.query.productID)

    products = products.filter(product => product.id != productID)

    res.redirect('/')
})

///update?productID=1
app.get('/update', (req, res) => {
    let productID = parseInt(req.query.productID)

    res.render('update', { product: products.find(product => product.id == productID) })
})

app.post('/update_product', upload.fields([]), (req, res) => {
    const { id, name, quantity } = req.body

    let index = products.findIndex(product => product.id == id)

    products[index]['name'] = name
    products[index]['quantity'] = quantity

    res.redirect('/')
})

app.listen(port, () => console.log(`Listening at port: ${port}`))