const express = require("express")
const app = express()
const Maquina = require("../../models/maquina")
const RESP = require("../../utils/respStatus")

const Departamento = require("../../models/departamento")

const Folio = require("../../models/folios/folio")
const mongoose = require("mongoose")
const ObjectId = mongoose.Types.ObjectId
var permisos = require("../../config/permisos.config")
var guard = require("express-jwt-permissions")()

const erro = (res, err, msj) => {
  return RESP._500(res, {
    msj: msj,
    err: err,
  })
}

app.post(
  "/asignar",
  permisos.$("programacionTransformacion:asignar"),
  (req, res) => {
    /**
     * Valores que recibimos
     *
     * @param idMaquina: string
     * @param ordenes: [{
     *      folio:string,
     *      pedido:string,
     *      orden:string,
     *      modeloCompleto: string, //Solo para facilitarnos la vida
     *      pasos: Number, //La cantidad de pasos que tiene la orden
     *      numeroDeOrden: string, //El numero de orden (con respecto a
     *          los procesos) para facilitarnos la vida.
     *      numerosDeOrden: [Number], // Los numeros de orden (procesos) pero
     *           juntos para saber que paso es este dato de orden
     *      paso: Number //Si es primer paso, 2do paso, etc.
     *
     *      cliente:String,
     *      idCliente:String,
     *      fechaPedidoProduccion: Date,
     *      esBaston:Boolean,
     *      marcaLaser:String,
     *      disponible:Boolean,
     * }]
     *
     *
     *
     */
    const datos = req.body

    Maquina.findById(datos.idMaquina)
      .exec()
      .then(maquina => {
        if (!maquina) throw " No existe  la maquina."

        return Maquina.update(
          { _id: maquina.id },
          { $set: { pila: datos.ordenes } }
        ).exec()
      })
      .then(maquina => {
        return RESP._200(res, "Se modificaron las ordenes", [
          { tipo: "maquina", datos: maquina },
        ])
      })
      .catch(err => erro(res, err, "Hubo un error asignando las ordenes"))
  }
)

app.get(
  "/ordenesPorAsignar",
  permisos.$("programacionTransformacion:ordenesPorAsignar"),
  async (req, res) => {
    //El id actual de transformacion
    const idTransformacion = req.parametros.departamentoTransformacion

    if (!idTransformacion)
      throw "No has definido el proceso correlacionado a transformacion."

    //Buscamos todas las maquinas y obtenemos todas las ordenes
    // que estan asignadas en pila. Con su idOrden vamos
    // a quitar de este reporte las que ya esten asignadas
    var ordenesAsignadas = null
    Maquina.aggregate([
      {
        //Solo las maquinas que tengan ordenes en la pila
        $match: { pila: { $exists: true, $ne: [] } },
      },
      {
        $unwind: { path: "$pila", preserveNullAndEmptyArrays:true },
      },

      {
        $project: {
          folio: "$pila.folio",
          pedido: "$pila.pedido",
          orden: "$pila.orden",
          paso: "$pila.paso",
        },
      },
    ])
      .exec()
      .then(ordAs => {
        ordenesAsignadas = ordAs
        // Si son dos pasos obtenemos dos ordenes, si son tres, 3 ordenes, etc.
        //  De esta manera vamos a guardar en la maquina el tipo de paso que la orden va a estar haciendo comparandolo contra la ubicacion actual que tenemos.

        return Folio.aggregate([
          // {
          //   $match: {
          //     // Folios sin terminar
          //     terminado: false,
          //   },
          // },
          // {
          //   $unwind: {
          //     path: "$folioLineas", preserveNullAndEmptyArrays:true
          //   },
          // },

          // {
          //   $match: {
          //     // Pedidos sin terminar y con
          //     // ordenes generadas
          //     "folioLineas.terminado": false,
          //     "folioLineas.ordenesGeneradas": true,
          //   },
          // },
          // {
          //   $unwind: {
          //     path: "$folioLineas.ordenes", preserveNullAndEmptyArrays:true
          //   },
          // },
          // {
          //   $match: {
          //     "folioLineas.ordenes.terminada": false,
          //     //El campo no debe de existir para
          //     //saber que no esta asignada.
          //     "folioLineas.ordenes.maquinaActual": {
          //       $exists: false,
          //       $eq: null,
          //     },
          //   },
          // },
          // {
          //   $unwind: {
          //     path: "$folioLineas.ordenes.ruta" , preserveNullAndEmptyArrays:true
          //   },
          // },

          // //El id de trasnformacion . De esta manera obtener solo las ordenes
          // // que tienen que pasar por transformacion.
          // {
          //   $match: {
          //     "folioLineas.ordenes.ruta.idProceso": ObjectId(idTransformacion),
          //   },
          // },
          // {
          //   // Agrupamos por que solo nos interesan los id del folio, pedido y orden.
          //   $group: {
          //     _id: {
          //       folio: "$_id",
          //       pedido: "$folioLineas._id",
          //       orden: "$folioLineas.ordenes._id",
          //       numeroDeOrden: "$folioLineas.ordenes.orden",
          //       modeloCompleto: "$folioLineas.ordenes.modeloCompleto", //solo para referencia
          //       ubicacionActual: "$folioLineas.ordenes.ubicacionActual",
          //       fechaPedidoProduccion: "$fechaDeEntregaAProduccion",
          //       fechaPedidoProducci: { $sum: [2, 3] },

          //       marcaLaser: "$folioLineas.laserCliente.laser",
          //       observacionesOrden: "$folioLineas.ordenes.observaciones",
          //       observacionesPedido: "$folioLineas.ordenes.observacionesPedido",
          //       observacionesFolio: "$folioLineas.ordenes.observacionesFolio",
          //       cliente: "$cliente",
          //     },
          //     //Los trayectos que coinciden con el id que le pasamos.
          //     //De esta manera sabemos si esta por encima de la ubicacion
          //     // actual y quitamos el trayecto (Por ejemplo, ya paso por segundo paso, entonces no hay que mostrar el segundo paso.)

          //     trayectos: { $push: "$folioLineas.ordenes.trayectoNormal" },
          //     //Este nos sirve para referenciar
          //     numerosDeOrden: {
          //       $push: "$folioLineas.ordenes.trayectoNormal.orden",
          //     },
          //     pasos: { $sum: 1 },
          //   },
          // },

          // //Ahora separamos de nuevo el arreglo de trayectos para hacer un match
          // // contra el numero de 'orden' que tiene la ubicacion actual. Si es menor
          // // no debe de aparecer. Si es igual, quiere decir que esta trabajando o
          // // pendiente de trabajar. (disponible?) y si es mayor todavia no llega.

          // {
          //   $unwind: {
          //     path: "$trayectos",
          //   },
          // },

          // {
          //   $match: {
          //     $expr: {
          //       $lte: ["$_id.ubicacionActual.orden", "$trayectos.orden"],
          //     },
          //   },
          // },
          // {
          //   $project: {
          //     folio: "$_id.folio",
          //     pedido: "$_id.pedido",
          //     orden: "$_id.orden",
          //     modeloCompleto: "$_id.modeloCompleto",
          //     numeroDeOrden: "$_id.numeroDeOrden",
          //     ubicacionActual: "$_id.ubicacionActual",
          //     trayectos: "$trayectos",
          //     pasos: "$pasos",
          //     numerosDeOrden: "$numerosDeOrden",
          //     fechaPedidoProduccion: "$_id.fechaPedidoProduccion",
          //     marcaLaser: "$_id.marcaLaser",
          //     observacionesOrden: "$_id.observacionesOrden",
          //     observacionesPedido: "$_id.observacionesPedido",
          //     observacionesFolio: "$_id.observacionesFolio",
          //     cliente: "$_id.cliente",
          //   },
          // },
          // { $unset: ["_id"] },
          // {
          //   $lookup: {
          //     from: "modelosCompletos",
          //     localField: "modeloCompleto",
          //     foreignField: "_id",
          //     as: "modeloCompleto",
          //   },
          // },
          // { $unwind: "$modeloCompleto" },
          // {
          //   $addFields: {
          //     modeloCompleto: "$modeloCompleto.nombreCompleto",
          //     laserAlmacen: "$modeloCompleto.laserAlmacen.laser",
          //     esBaston: "$modeloCompleto.esBaston",
          //   },
          // },
          // {
          //   $lookup: {
          //     from: "clientes",
          //     localField: "cliente",
          //     foreignField: "_id",
          //     as: "cliente",
          //   },
          // },
          // { $unwind: "$cliente" },
          // {
          //   $addFields: {
          //     cliente: "$cliente.nombre",
          //     idCliente: "$cliente._id",
          //   },
          // },
          // {
          //   $project: {
          //     folio: "$folio",
          //     pedido: "$pedido",
          //     orden: "$orden",
          //     modeloCompleto: "$modeloCompleto",
          //     numeroDeOrden: "$numeroDeOrden",
          //     ubicacionActual: "$ubicacionActual",
          //     trayectos: "$trayectos",
          //     pasos: "$pasos",
          //     numerosDeOrden: "$numerosDeOrden",
          //     fechaPedidoProduccion: "$fechaPedidoProduccion",
          //     cliente: "$cliente",
          //     laserAlmacen: "$laserAlmacen",
          //     esBaston: "$esBaston",
          //     idCliente: "$idCliente",
          //     paso: "$paso",

          //     disponible: {
          //       $eq: [
          //         { $cmp: ["$ubicacionActual.orden", "$trayectos.orden"] },
          //         0,
          //       ],
          //     },
          //   },
          // },

          // {
          //   $match: {
          //     $or: [
          //       {
          //         "ubicacionActual.transformacion.trabajando": false,
          //       },
          //       {
          //         "ubicacionActual.transformacion.trabajando": {
          //           $exists: false,
          //         },
          //       },
          //     ],
          //   },
          // },
          // {
          //   $lookup: {
          //     from: "departamentos",
          //     localField: "ubicacionActual.departamento",
          //     foreignField: "_id",
          //     as: "ubicacionActual.departamento",
          //   },
          // },
          // {
          //   $unwind: "$ubicacionActual.departamento",
          // },
          // {
          //   $addFields: {
          //     "ubicacionActual.departamento":
          //       "$ubicacionActual.departamento.nombre",
          //   },
          // },
          [
            {
              '$match': {
                'terminado': false
              }
            }, {
              '$unwind': {
                'path': '$folioLineas', 
                'preserveNullAndEmptyArrays': true
              }
            }, {
              '$match': {
                'folioLineas.terminado': false, 
                'folioLineas.ordenesGeneradas': true
              }
            }, {
              '$unwind': {
                'path': '$folioLineas.ordenes', 
                'preserveNullAndEmptyArrays': true
              }
            }, {
              '$match': {
                'folioLineas.ordenes.terminada': false, 
                'folioLineas.ordenes.maquinaActual': {
                  '$exists': false, 
                  '$eq': null
                }
              }
            }, {
              '$addFields': {
                'folioLineas.ordenes.rutaActual': {
                  '$filter': {
                    'input': '$folioLineas.ordenes.ruta', 
                    'as': 'item', 
                    'cond': {
                      '$eq': [
                        '$$item.ubicacionActual', true
                      ]
                    }
                  }
                }
              }
            }, {
              '$unwind': {
                'path': '$folioLineas.ordenes.rutaActual', 
                'preserveNullAndEmptyArrays': true
              }
            }, {
              '$unwind': {
                'path': '$folioLineas.ordenes.ruta', 
                'preserveNullAndEmptyArrays': true
              }
            }, {
              '$match': {
                'folioLineas.ordenes.ruta.idDepartamento': idTransformacion
              }
            }, {
              '$group': {
                '_id': {
                  'folio': '$_id', 
                  'pedido': '$folioLineas._id', 
                  'orden': '$folioLineas.ordenes._id', 
                  'numeroDeOrden': '$folioLineas.ordenes.orden', 
                  'modeloCompleto': '$folioLineas.ordenes.modeloCompleto', 
                  'ubicacionActual': '$folioLineas.ordenes.rutaActual', 
                  'fechaPedidoProduccion': '$fechaDeEntregaAProduccion', 
                  'marcaLaser': '$folioLineas.laserCliente.laser', 
                  'observacionesOrden': '$folioLineas.ordenes.observaciones', 
                  'observacionesPedido': '$folioLineas.ordenes.observacionesPedido', 
                  'observacionesFolio': '$folioLineas.ordenes.observacionesFolio', 
                  'cliente': '$cliente'
                }, 
                'ruta': {
                  '$push': '$folioLineas.ordenes.ruta'
                }, 
                'numerosDeOrden': {
                  '$push': '$folioLineas.ordenes.ruta.consecutivo'
                }, 
                'pasos': {
                  '$sum': 1
                }
              }
            }, {
              '$unwind': {
                'path': '$ruta', 
                'preserveNullAndEmptyArrays': true
              }
            }, {
              '$match': {
                '$expr': {
                  '$lte': [
                    '$_id.ubicacionActual.orden', '$trayectos.orden'
                  ]
                }
              }
            }, {
              '$project': {
                'folio': '$_id.folio', 
                'pedido': '$_id.pedido', 
                'orden': '$_id.orden', 
                'modeloCompleto': '$_id.modeloCompleto', 
                'numeroDeOrden': '$_id.numeroDeOrden', 
                'ubicacionActual': '$_id.ubicacionActual', 
                'ruta': '$ruta', 
                'pasos': '$pasos', 
                'numerosDeOrden': '$numerosDeOrden', 
                'fechaPedidoProduccion': '$_id.fechaPedidoProduccion', 
                'marcaLaser': '$_id.marcaLaser', 
                'observacionesOrden': '$_id.observacionesOrden', 
                'observacionesPedido': '$_id.observacionesPedido', 
                'observacionesFolio': '$_id.observacionesFolio', 
                'cliente': '$_id.cliente'
              }
            }, {
              '$unset': [
                '_id'
              ]
            }, {
              '$lookup': {
                'from': 'modelosCompletos', 
                'localField': 'modeloCompleto', 
                'foreignField': '_id', 
                'as': 'modeloCompleto'
              }
            }, {
              '$unwind': {
                'path': '$modeloCompleto', 
                'preserveNullAndEmptyArrays': true
              }
            }, {
              '$addFields': {
                'modeloCompleto': '$modeloCompleto.nombreCompleto', 
                'laserAlmacen': '$modeloCompleto.laserAlmacen.laser', 
                'esBaston': '$modeloCompleto.esBaston'
              }
            }, {
              '$lookup': {
                'from': 'clientes', 
                'localField': 'cliente', 
                'foreignField': '_id', 
                'as': 'cliente'
              }
            }, {
              '$unwind': {
                'path': '$cliente', 
                'preserveNullAndEmptyArrays': true
              }
            }, {
              '$addFields': {
                'cliente': '$cliente.nombre', 
                'idCliente': '$cliente._id'
              }
            }, {
              '$project': {
                'folio': '$folio', 
                'pedido': '$pedido', 
                'orden': '$orden', 
                'modeloCompleto': '$modeloCompleto', 
                'numeroDeOrden': '$numeroDeOrden', 
                'ubicacionActual': '$ubicacionActual', 
                'ruta': '$ruta', 
                'pasos': '$pasos', 
                'numerosDeOrden': '$numerosDeOrden', 
                'fechaPedidoProduccion': '$fechaPedidoProduccion', 
                'cliente': '$cliente', 
                'laserAlmacen': '$laserAlmacen', 
                'esBaston': '$esBaston', 
                'idCliente': '$idCliente', 
                'disponible': {
                  '$eq': [
                    {
                      '$cmp': [
                        '$ubicacionActual.consecutivo', 'ruta.consecutivo'
                      ]
                    }, 0
                  ]
                }
              }
            }, {
              '$addFields': {
                'ubicacionActual.idDepartamento': {
                  '$toObjectId': '$ubicacionActual.idDepartamento'
                }, 
                'ubicacionActual.idProceso': {
                  '$toObjectId': '$ubicacionActual.idProceso'
                }
              }
            }, {
              '$lookup': {
                'from': 'departamentos', 
                'localField': 'ubicacionActual.idDepartamento', 
                'foreignField': '_id', 
                'as': 'ubicacionActual.departamento'
              }
            }, {
              '$unwind': {
                'path': '$ubicacionActual.departamento', 
                'preserveNullAndEmptyArrays': true
              }
            }, {
              '$addFields': {
                'ubicacionActual.departamento': '$ubicacionActual.departamento.nombre'
              }
            }
          ]
        ]).exec()
      })
      .then(ordenes => {
        // return res.send(ordenes)
        /**
         * Obtenemos esta estructura:
         *{
         * "folio": "5e4f14117536df07860ca3ae",
         * "pedido": "5e4f14117536df07860ca3af",
         * "orden": "5e500a3997a86a078c4322bf",
         * "modeloCompleto": "2505-36-1-GIS-BRILLANTE",
         * "numeroDeOrden": "105-1-0",
         * "ubicacionActual": {
         *     "recivida": false,
         *     "_id": "5e500a3a97a86a078c432418",
         *     "departamento": "5c6f07f6a6fd170abc390916",
         *     "orden": "1"
         * },
         * "trayectos": {
         *     "recivida": false,
         *     "_id": "5e500a3a97a86a078c432412",
         *     "orden": "3",
         *     "departamento": "5c6f07f6a6fd170abc39091b"
         * },
         * "pasos": 1,
         * "numerosDeOrden": [
         *     "3"
         * ],
         * "fechaPedidoProduccion": "2020-02-20T23:20:44.412Z",
         * "cliente": "ALMACÉN",
         * "laserAlmacen": "",
         * "esBaston": false,
         * "idCliente": "5d091d9182465a06140e9c7b"
         * }
         *  Ahora vamos a clasificar cada una de estas ordenes como primero, segundo, ...., pasos.
         *
         *
         */
        ordenes.map(orden => (orden["paso"] = obtenerPaso(orden)))

        //Quitamos las ordenes que ya estan asignadas.a
        ordenes = ordenes.filter(x => {
          return !(
            ordenesAsignadas.filter(
              oa =>
                oa.orden.toString() == x.orden.toString() && oa.paso == x.paso
            ).length > 0
          )
        })

        res.send({ ordenes })
      })
      .catch(err =>
        erro(res, err, "Hubo un error comprobando si la orden esta asignada")
      )
  }
)

/**
 *Obtiene el numero correspondiente al paso en que esta la orden.
 *
 */
function obtenerPaso(orden) {
  const consecutivo = orden.ruta.consecutivo * 1

  const paso = orden.numerosDeOrden.findIndex(x => x * 1 === consecutivo)

  if (paso < 0) throw "No se encontro el paso de la orden"

  return paso + 1
}

var datos = null
app.put(
  "/actualizarUbicacion/:idT",
  permisos.$("programacionTransformacion:actualizarUbicacion"),
  (req, res) => {
    Maquina.aggregate([
      {
        $match: {
          departamentos: {
            $elemMatch: {
              $eq: ObjectId(req.parametros.departamentoTransformacion),
            },
          },
          "pila.0": { $exists: true },
        },
      },
      {
        $project: {
          idMaquina: "$_id",
          pila: "$pila",
        },
      },

      {
        $unwind: "$pila",
      },
      {
        $lookup: {
          from: "folios",
          localField: "pila.folio",
          foreignField: "_id",
          as: "pila.folio",
        },
      },
      { $unwind: "$pila.folio" },

      {
        $project: {
          idMaquina: "$idMaquina",
          idPila: "$pila._id",
          pila: "$pila",
          folio: "$pila.folio._id",
          pedido: "$pila.pedido",
          orden: "$pila.orden",
        },
      },

      { $unwind: "$pila.folio.folioLineas" },

      {
        $project: {
          idMaquina: "$idMaquina",
          idPila: "$idPila",
          "pila.folio._id": "$pila.folio._id",
          "pila.folio.folioLineas._id": "$pila.folio.folioLineas._id",
          "pila.folio.folioLineas.ordenes": "$pila.folio.folioLineas.ordenes",
          folio: "$folio",
          pedido: "$pedido",
          orden: "$orden",
        },
      },
      { $unwind: "$pila.folio.folioLineas.ordenes" },

      {
        $project: {
          idMaquina: "$idMaquina",
          idPila: "$idPila",
          "pila.folio._id": "$pila.folio._id",
          "pila.folio.folioLineas._id": "$pila.folio.folioLineas._id",
          "pila.folio.folioLineas.ordenes._id":
            "$pila.folio.folioLineas.ordenes._id",
          "pila.folio.folioLineas.ordenes.ubicacionActual":
            "$pila.folio.folioLineas.ordenes.ubicacionActual",
          folio: "$folio",
          pedido: "$pedido",
          orden: "$orden",
        },
      },
      {
        $project: {
          idMaquina: 1,
          idPila: 1,
          pila: 1,
          folio: 1,
          pedido: 1,
          orden: 1,
          cmp_value_folio: { $cmp: ["$folio", "$pila.folio._id"] },
          cmp_value_pedido: {
            $cmp: ["$pedido", "$pila.folio.folioLineas._id"],
          },
          cmp_value_orden: {
            $cmp: ["$orden", "$pila.folio.folioLineas.ordenes._id"],
          },
        },
      },
      {
        $match: {
          cmp_value_folio: { $eq: 0 },
          cmp_value_pedido: { $eq: 0 },
          cmp_value_orden: { $eq: 0 },
        },
      },
      {
        $project: {
          idMaquina: 1,
          idPila: 1,
          folio: 1,
          pedido: 1,
          orden: 1,
          ubicacionActual: "$pila.folio.folioLineas.ordenes.ubicacionActual",
        },
      },
      {
        $lookup: {
          from: "departamentos",
          localField: "ubicacionActual.departamento",
          foreignField: "_id",
          as: "ubicacionActual.departamento",
        },
      },
      {
        $unwind: "$ubicacionActual.departamento",
      },
      {
        $addFields: {
          "ubicacionActual.departamento":
            "$ubicacionActual.departamento.nombre",
        },
      },
    ])
      .exec()
      .then(dat => {
        return res.send(req.parametros)
        datos = dat
        return Maquina.find({
          _id: { $in: datos.map(d => d.idMaquina) },
        }).exec()
      })
      // .then(maquinas => {
      //   const promesas = []
      //   maquinas.forEach(maquina => {
      //     datos.forEach(d => {
      //       const pila = maquina.pila.id(d.idPila)
      //       if (pila) {
      //         pila.ubicacionActual = d.ubicacionActual
      //         pila.disponible =
      //           pila.ubicacionActual.orden === pila.trayectos.orden
      //       }
      //     })

      //     promesas.push(maquina.save())
      //   })

      //   return Promise.all(promesas)
      // })
      .then(maquinas => {
        return RESP._200(res, "Se actualizo la ubicacion de las ordenes", [])
      })
      .catch(err =>
        erro(
          res,
          err,
          "Hubo un error actualizando la ubicaciones de las ordenes"
        )
      )
  }
)

module.exports = app
