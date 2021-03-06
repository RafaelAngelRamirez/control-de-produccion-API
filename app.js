require("dotenv").config()
const compression = require("compression")
// Requires
const express = require("express")

const https = require("https")
const fs = require("fs")

const mongoose = require("mongoose")
mongoose.Promise = global.Promise
const colores = require("./utils/colors")
const bodyParser = require("body-parser")
const RESP = require("./utils/respStatus")
const _ROUTES = require("./config/routes").ROUTES
const cors = require("cors")

// Inicializar variables.
var app = express()

app.disable("x-powered-by")

// Esta función nos ayuda a quitar duplicados dentro
//  del array.
Array.prototype.unique = (function (a) {
  return function () {
    return this.filter(a)
  }
})(function (a, b, c) {
  return c.indexOf(a, b + 1) < 0
})

Array.prototype.greaterThan0 = function (a) {
  return a.length >= 1
}

app.use(compression())
app.use(cors())

//  Body parser
// parse application/x-www-form-urlencoded
app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }))

//Convierte los valores de los query que se pasan por url
// en valores. Ej. 'true'=> true, '1000' => 1000
app.use(require("express-query-auto-parse")())

mongoose.set("useNewUrlParser", true)
mongoose.set("useUnifiedTopology", true)
mongoose.set("useCreateIndex", true)
mongoose.connection.openUri(process.env.URI, (err, res) => {
  if (err) {
    // Mensaje de error en la base de datos.
    console.log(err)
    throw err
  }
  // Mensaje de conexion exitosa a la BD
  console.log("[ INFO ] Conectado a la BD")
})

app.use((req, res, next) => {
  if (process.env.PROUDCCION === "true") {
    console.log(
      `${new Date()}|` +
        colores.success("PETICION RECIBIDA") +
        colores.danger(req.method) +
        colores.info(req.originalUrl)
    )
  }
  next()
})

_ROUTES(app)

// Llamamos a los errores.
app.use(function (req, res) {
  return RESP._404(res, {
    msj: "La pagina solicitada no existe.",
    err: "La pagina que solicitaste no existe.",
  })
})

app.use(function (err, req, res, next) {
  console.log(`err`, err)
  //Errores de permisos
  const errores = [
    //Cuando el token no trae un usuario
    "user_object_not_found",
    //No autorizado
    "permission_denied",
  ]

  if (errores.includes(err.code)) {
    return res
      .status(403)
      .send(
        `No tienes permisos para acceder a este contenido: '${req.permisoSolicitado}'`
      )
  }

  if (err.code === "invalid_token") {
    return res.status(401).send("Token invalido. Inicia sesion de nuevo")
  }

  if (err.code === "credentials_required") {
    return res.status(401).send("Es necesario loguearte")
  }

  return RESP._500(res, {
    msj: "Hubo un error.",
    err: err,
  })
})

const msjServidor = () => {
  console.log(`Servidor iniciado en el puerto: ${process.env.PORT}`)
}

if (process.env.PRODUCCION === "true") {
  console.log("[ INFO ] Modo produccion")
  app.listen(process.env.PORT, msjServidor)
} else {
  https
    .createServer(
      {
        key: fs.readFileSync(
          "f:/proyectos/geracion-de-certificados/cert/desarrollo.key"
        ),
        cert: fs.readFileSync(
          "f:/proyectos/geracion-de-certificados/cert/desarrollo.crt"
        ),
      },
      app
    )
    .listen(process.env.PORT, msjServidor)
}
