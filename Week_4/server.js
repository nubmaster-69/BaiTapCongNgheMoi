require('dotenv/config')

const exp = require('express')
const app = exp()
const port = process.env.PORT

// Config ExpressJs
app.use(exp.static('./templates'))
app.set('view engine', 'ejs')
app.set('views', './templates')

let products = require('./local_data_store').products

app.get('/', (req, res) => {
    res.send(products)
})

app.listen(port, () => console.log(`Listening at port: ${port}`))