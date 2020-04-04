let express = require("express")
let app = express()
let FamiliaDeProcesos = require("../models/procesos/familiaDeProcesos")
let ModeloCompleto = require("../models/modeloCompleto")
let Proceso = require("../models/procesos/proceso")
let RESP = require("../utils/respStatus")
let PROC = require("../config/procesosDefault")

var guard = require("express-jwt-permissions")()
var permisos = require("../config/permisos.config")

const erro = (res, err, msj) => {
  return RESP._500(res, {
    msj: msj,
    err: err,
  })
}

// ============================================
// Guardamos una nueva famila de procesos.
// ============================================
app.post(
  "/",
  guard.check(permisos.$("familiaDeProcesos:crear")),
  (req, res) => {
    const familiaDeProcesos = new FamiliaDeProcesos(req.body)

    // Comprobamos que el órden no este repetido.
    let normal = []
    familiaDeProcesos.procesos.forEach((f) => {
      normal.push(f.orden)
    })

    if (normal.unique().length < normal.length) {
      return RESP._400(res, {
        msj: "No puede ser repetido",
        err: "No se debe repetir el número de órden.",
      })
    }

    // Guardamos por defecto CONTROL DE PRODUCCIÓN como el primer proceso que se debe realizar en la familia. y
    // como primer departamento por defecto.
    // Lo buscamos
    const p = Proceso.findOne({ nombre: PROC.CONTROL_DE_PRODUCCION._n }).exec()
    p.then((procesoD) => {
      if (!procesoD) {
        return RESP._500(res, {
          msj:
            "Hubo un error buscando el proceso por defecto: " +
            PROC.CONTROL_PRODUCCION._n,
          err:
            "El sistema necesita este proceso para poder continuar. (¿Defaults no funcionan?)",
          masInfo: [
            {
              infoAdicional:
                CONST.ERRORES.MAS_INFO.TIPO_ERROR.NO_DATA.infoAdicional,
              dataAdicional:
                CONST.ERRORES.MAS_INFO.TIPO_ERROR.NO_DATA.dataAdicional,
            },
          ],
        })
      }
      familiaDeProcesos.procesos.unshift({ proceso: procesoD._id, orden: 0 })
      return familiaDeProcesos.save()
    })
      .then((familiaNueva) => {
        return RESP._200(res, "Se guardo la familia de manera correcta.", [
          { tipo: "familiaDeProcesos", datos: familiaNueva },
        ])
      })
      .catch((err) => {
        return RESP._500(res, {
          msj: "Hubo un error guardando la familia de procesos.",
          err: err,
        })
      })
  }
)

app.get(
  "/",
  guard.check(permisos.$("familiaDeProcesos:leer:todo")),
  async (req, res) => {
    const desde = Number(req.query.desde || 0)
    const limite = Number(req.query.limite || 30)
    const sort = Number(req.query.sort || 1)
    const campo = String(req.query.campo || "nombre")

    const total = await FamiliaDeProcesos.countDocuments().exec()
    FamiliaDeProcesos.find()
      .sort({ [campo]: sort })
      .limit(limite)
      .skip(desde)
      .exec()
      .then((familiasDeProcesos) => {
        return RESP._200(res, null, [
          { tipo: "familiaDeProcesos", datos: familiasDeProcesos },
          { tipo: "total", datos: total },
        ])
      })
      .catch((err) =>
        erro(res, err, "Hubo un error buscando las familias de procesos")
      )
  }
)

app.get(
  "/:id",
  guard.check(permisos.$("familiaDeProcesos:leer:id")),
  (req, res) => {
    FamiliaDeProcesos.findById(req.params.id)
      .exec()
      .then((familiaDeProcesos) => {
        if (!familiaDeProcesos) throw "No existe el id"
        return RESP._200(res, null, [
          { tipo: "familiaDeProcesos", datos: familiaDeProcesos },
        ])
      })
      .catch((err) =>
        erro(
          res,
          err,
          "Hubo un error buscando la familia de procesos por su id"
        )
      )
  }
)

app.get(
  "/buscar/:termino",
  guard.check(permisos.$("familiaDeProcesos:leer:termino")),
  async (req, res) => {
    const desde = Number(req.query.desde || 0)
    const limite = Number(req.query.limite || 30)
    const sort = Number(req.query.sort || 1)
    const campo = String(req.query.campo || "nombre")
    const termino = req.params.termino

    const b = (campo) => ({
      [campo]: { $regex: termino, $options: "i" },
    })
    console.log(`termino`, termino)
    const $match = {
      $or: [],
    }

    ;["nombre", "observaciones"].forEach((x) => $match.$or.push(b(x)))

    const total = await FamiliaDeProcesos.aggregate([
      { $match },
      { $count: "total" },
    ]).exec()

    FamiliaDeProcesos.aggregate([
      { $match },

      //Fin de populacion

      { $sort: { [campo]: sort } },
      //Desde aqui limitamos unicamente lo que queremos ver
      { $limit: desde + limite },
      { $skip: desde },
      { $sort: { [campo]: sort } },
    ])
      .exec()
      .then((familiasDeProcesos) => {
        //Si no hay resultados no se crea la propiedad
        // y mas adelante nos da error.
        if (!total.length) total.push({ total: 0 })

        return RESP._200(res, null, [
          { tipo: "familiasDeProcesos", datos: familiasDeProcesos },
          { tipo: "total", datos: total.pop().total },
        ])
      })
      .catch((err) =>
        erro(
          res,
          err,
          "Hubo un error buscando las familias por el termino " + termino
        )
      )
  }
)

app.delete(
  "/:id",
  guard.check(permisos.$("familiaDeProcesos:eliminar")),
  (req, res) => {
    FamiliaDeProcesos.findById(req.params.id)
      .exec()
      .then((familiaDeProcesos) => {
        if (!familiaDeProcesos) throw "No existe el id"

        return familiaDeProcesos.remove()
      })
      .then((familiaDeProcesos) => {
        return RESP._200(res, "Se elimino de manera correcta", [
          { tipo: "familiaDeProcesos", datos: familiaDeProcesos },
        ])
      })
      .catch((err) =>
        erro(res, err, "Hubo un error eliminando la familia de procesos")
      )
  }
)

app.put(
  "/",
  guard.check(permisos.$("familiaDeProcesos:modificar")),
  (req, res) => {
    FamiliaDeProcesos.findById(req.body._id)
      .exec()
      .then((familiaDeProcesos) => {
        if (!familiaDeProcesos) throw "No existe el id"
        ;[
          "procesos",
          "nombre",
          "soloParaProductoTerminado",
          "observaciones",
        ].forEach((x) => (familiaDeProcesos[x] = req.body[x]))

        return familiaDeProcesos.save()
      })
      .then((familiaDeProcesos) => {
        return RESP._200(res, "Se modifico correctamente", [
          { tipo: "familiaDeProcesos", datos: familiaDeProcesos },
        ])
      })
      .catch((err) =>
        erro(res, err, "Hubo un error actualizando el familiaDeProcesos")
      )
  }
)

// ============================================
// Guardamos una familia existente a un modelo.
// ============================================

// app.put("/:idModeloCompleto/:idFamilia",  (req, res) => {
//   //Obtenemos los id.
//   var idFamilia = req.params.idFamilia
//   var idModeloCompleto = req.params.idModeloCompleto

//   //Comprobamos que el modelo exista.
//   var busqueda = {
//     _id: idModeloCompleto,
//   }

//   var set = {
//     $set: {
//       familiaDeProcesos: idFamilia,
//     },
//   }

//   ModeloCompleto.findByIdAndUpdate(busqueda, set, (err, doc) => {
//     if (err) {
//       return res.status(500).json({
//         ok: false,
//         mensaje: "Hubo un error.",
//         error: { message: err },
//       })
//     }
//     if (!doc) {
//       return res.status(400).json({
//         ok: false,
//         mensaje: "El modelo no existe.",
//         doc: doc,
//         error: { message: err },
//       })
//     }
//     return res.status(200).json({
//       ok: true,
//     })
//   })
// })

module.exports = app
