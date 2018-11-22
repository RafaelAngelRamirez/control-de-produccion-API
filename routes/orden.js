//Esto es necesario
var express = require('express');
var app = express();
var colores = require('../utils/colors');
var NVU = require('../config/nivelesDeUrgencia');

var Folio = require('../models/folios/folio');
var Departamento = require('../models/departamento');
var RESP = require('../utils/respStatus');
var CONST = require('../utils/constantes');
var Maquina = require('../models/maquina');



function buscarOrdenDentroDeFolio(fol, id) {
    // Esta función solo funciona si antes se ha comprobado
    // que la órden existe dentro del departamento. 
    let orden = null;
    for (let i = 0; i < fol.folioLineas.length; i++) {
        const linea = fol.folioLineas[i];
        orden = linea.ordenes.id(id);
        if (orden) {
            break;
        }
    }
    return orden;
}

function esDeptoActual(orden, depto) {
    // Comprueba que la órden este en el mismo 
    // departamento que el se esta mandando.     
    return orden.ubicacionActual.departamento.nombre === depto.nombre;
}

// ============================================
// Recive la órden que se le pase. 
// ============================================
// Todos los departamentos necesitan recivir las 
// órdenes antes de empezar a trabajarlas. 
app.put('/', (req, res) => {
    const id_de_la_orden = req.body._id;
    const depto = req.body.departamento;
    const deptoTrabajado = req.body.deptoTrabajado;
    var mensajeGeneral = '';

    console.log('Este es el departamento => ');
    console.log(deptoTrabajado);


    // ============================================
    // Parametros varios para trabajo de órden. 
    // ============================================
    // empeazarATrabajar: Si es true.
    const empezarATrabajar = req.query.empezarATrabajar;

    Promise.all([
        existeFolioConOrden(id_de_la_orden),
        existeDepartamento(depto)
    ]).then(respuestas => {
        const fol = respuestas[0];
        const departamento = respuestas[1];

        // Se encuentra en este departamento. 
        let orden = buscarOrdenDentroDeFolio(fol, id_de_la_orden);


        // const esDeptoActual = orden.ubicacionActual.departamento.nombre === departamento.nombre;
        if (!esDeptoActual(orden, departamento)) {
            return RESP._400(res, {
                msj: 'Esta órden no se encuentra en este departamento',
                err: `La órden existe pero no esta disponible para este departamento. Actualmente se encuentra registrada en '${orden.ubicacionActual.departamento.nombre}'`,
            });
        }

        if (orden.ubicacionActual.recivida) {
            // Si la órden ya fue recivida entonces la señalamos que empieza a trabajar. 
            console.log('La órden esta recivida: => empezarAtrabajar: ' + empezarATrabajar);

            if (empezarATrabajar) {
                if (!deptoTrabajado) {
                    return RESP._400(res, {
                        msj: 'No se recivio el departamento para modificar.',
                        err: 'Es necesario pasar el departamento que se va a modificar para guardarlo.',
                        masInfo: [{
                            infoAdicional: CONST.ERRORES.MAS_INFO.TIPO_ERROR.NO_DATA.infoAdicional,
                            dataAdicional: CONST.ERRORES.MAS_INFO.TIPO_ERROR.NO_DATA.dataAdicional
                        }]
                    });
                }


                if (orden.ubicacionActual.hasOwnProperty(depto.toLowerCase())) {
                    if (orden.ubicacionActual[depto.toLowerCase()].trabajando) {
                        return RESP._400(res, {
                            msj: 'Esta órden ya se encuentra trabajando.',
                            err: 'La órden ya se encuentra trabajando en esta ubicación.',
                        });
                    }
                }

                deptoTrabajado.trabajando = true;
                orden.ubicacionActual[depto.toLowerCase()] = deptoTrabajado;
                console.log('La órden que se va a grabar.');
                console.log(orden);

                mensajeGeneral = 'Órden trabajando.';
                return fol.save();
            }


            return RESP._400(res, {
                msj: 'Está órden ya fue recivida.',
                err: 'La órden ya esta trabajandose.',
            });
        }
        // Recivimos la órden.
        mensajeGeneral = 'Se recivio la órden.';
        orden.ubicacionActual.recivida = true;
        orden.ubicacionActual.recepcion = new Date();
        return fol.save();
    }).then(folioGrabado => {
        const orden = buscarOrdenDentroDeFolio(folioGrabado, id_de_la_orden);
        return RESP._200(res, mensajeGeneral, [
            { tipo: 'orden', orden },
        ]);
    }).catch(err => {
        return RESP._500(res, err);
    });

});

function existeFolioConOrden(id) {
    const uno = {
        'folioLineas.ordenes': { '$elemMatch': { _id: id } }
    };
    return new Promise((resolve, reject) => {
        const fol = Folio.findOne(uno)
            .populate('folioLineas.ordenes.ubicacionActual.departamento')
            .exec();
        fol.then(folioEncontrado => {
            if (!folioEncontrado) {
                reject(RESP.errorGeneral({
                    msj: 'No existe la órden.',
                    err: 'El id de la órden que ingresaste no existe.',
                }));
            }
            console.log(folioEncontrado);

            resolve(folioEncontrado);
        }).catch(err => {
            reject(RESP.errorGeneral({
                msj: 'Hubo un error buscando la órden.',
                err: err,
            }));
        });

    });

}

// ============================================
// Obtiene la órden de un departamento dado.
// ============================================

app.get('/:idOrden/:departamento', (req, res) => {

    const idOrden = req.params.idOrden;
    const departamento = (req.params.departamento).toUpperCase();

    Promise.all([
        orden(idOrden),
        existeDepartamento(departamento),
    ]).then(respuestas => {

        const orden = respuestas[0][0];
        if (orden.terminada) {
            return RESP._400(res, {
                msj: 'Esta órden ya esta terminada',
                err: 'La órden finalizó su trayecto. ',
            });
        }


        const modeloCompleto = respuestas[0][1];
        const depto = respuestas[1];

        const esDeptoActual = orden.ubicacionActual.departamento.nombre === depto.nombre;
        if (!esDeptoActual) {
            return RESP._400(res, {
                msj: 'Esta órden no se encuentra en este departamento',
                err: `La órden existe pero no esta disponible para este departamento. Actualmente se encuentra registrada en '${orden.ubicacionActual.departamento.nombre}'`,
            });
        }

        if (!orden.ubicacionActual.recivida) {
            const tamanoTrayecto = orden.trayectoRecorrido.length;
            // Si no existe trayecto tiene que dar el mensaje de que no ha sido en
            // entregada para producción. 
            let msj_Err = '';
            if (tamanoTrayecto > 0) {
                const deptoAnterior = orden.trayectoRecorrido[tamanoTrayecto - 1];
                msj_Err = `Esta órden ya fue terminada por el departamento de ${deptoAnterior.departamento.nombre}, pero es necesario que la recivas para poder empezar a trabajarla.`;
            } else {
                const EsteDepto = `Para poder registrarla es necesario que la recivas primero.`;
                msj_Err = `La órden todavía no ha sido entregada para empezar su producción. ` + EsteDepto;
            }
            return RESP._400(res, {
                msj: 'Órden sin recibir.',
                err: msj_Err,
            });

        }

        return RESP._200(res, null, [
            { tipo: 'orden', datos: orden },
            { tipo: 'modeloCompleto', datos: modeloCompleto },
        ]);


    }).catch(err => {
        return RESP._500(res, err);
    });
});

function orden(idOrden) {
    // Buscamos un folio que contenga la órden con el id que le pasemos
    // como parametro. Esto nos devuelve todo el folio pero solo la linea
    // que necesitamos. 
    const uno = {
        'folioLineas.ordenes': { '$elemMatch': { _id: idOrden } },
    };
    return new Promise((resolve, reject) => {
        const folioPromesa = Folio.findOne(uno)
            .populate('folioLineas.ordenes.ubicacionActual.departamento')
            .populate('folioLineas.ordenes.trayectoRecorrido.departamento')
            .populate({
                path: 'folioLineas.ordenes.ubicacionActual.transformacion.maquinaActual',

            })
            .populate('folioLineas.ordenes.trayectoNormal.departamento')
            .populate({
                path: 'folioLineas.modeloCompleto',
                populate: {
                    path: 'modelo tamano color terminado laserAlmacen versionModelo'
                }
            }).exec();


        folioPromesa.then(folioEncontrado => {
                //No hubo ningúna coincidencia. 
                if (!folioEncontrado) {
                    // Como no hay coincidencia la órden no existe.
                    reject(RESP.errorGeneral({
                        msj: 'La órden no existe.',
                        err: 'El id que ingresaste no coincide con ningúna órden.',
                    }));
                } else {

                    const linea = folioEncontrado.folioLineas.find((linea) => {
                        return linea.ordenes.id(idOrden);
                    });
                    const orden = linea.ordenes.id(idOrden);

                    resolve([orden, linea.modeloCompleto]);
                }
            })
            .catch(err => {
                reject(RESP.errorGeneral({
                    msj: 'Hubo un error buscando la órden',
                    err: err,
                }));
            });
    });

}

function existeDepartamento(departamento) {

    return new Promise((resolve, reject) => {
        const d = Departamento.findOne({ nombre: departamento.toUpperCase() }).exec();
        d.then(departamentoEncontrado => {
                if (!departamentoEncontrado) {
                    reject(RESP.errorGeneral({
                        msj: 'No existe el departamento.',
                        err: 'El departamento que ingresaste no existe o no esta registrado.',
                    }));
                }
                resolve(departamentoEncontrado);
            })
            .catch(err => {
                reject(RESP.errorGeneral({
                    msj: 'Hubo un error buscando el departamento.',
                    err: err,
                }));
            });


    });
}

// ============================================
// OBTIENE LA LISTA DE ÓRDENES POR DEPARTAMENTO.
// ============================================
app.get('/:depto', (req, res) => {
    const depto = (req.params.depto).toUpperCase();

    const d = Departamento.findOne({ nombre: depto }).exec();

    d.then(departamento => {
        if (!departamento) {
            return RESP._400(res, {
                msj: 'Error al buscar el departamento.',
                err: 'El departamento que ingresaste no existe.',
            });
        }

        // Primero buscamos todos los folios que tengan órdenes actuales en ese departamento
        const busqueda = {
            // El la busqueda departamento no esta populado por eso buscamos en .departamento y no
            // en .departamento._id
            'folioLineas.ordenes.ubicacionActual.departamento': departamento._id,
            // Si la órden no esta terminada si la tomanos en cuenta. 
            'folioLineas.ordenes.terminada': false

        };

        return Folio.find(busqueda)
            .populate('folioLineas.ordenes.ubicacionActual.departamento')
            .populate({
                path: 'folioLineas.modeloCompleto',
                populate: {
                    path: 'modelo tamano color terminado marcaLaser versionModelo'
                }
            }).populate('folioLineas.laserCliente').exec();

    }).then(folios => {


        //    Creamos la estrucutura para guardar las órdenes por nivel. 
        const ordenes = {};
        for (var n in NVU.LV) {
            ordenes[NVU.LV[n]] = [];
        }

        // Recorremos todos los folios para extraer las órdenes. 
        for (let i = 0; i < folios.length; i++) {
            const folio = folios[i];
            // Recorremos la linea del folio para extraer órdenes. 
            for (let i = 0; i < folio.folioLineas.length; i++) {
                const linea = folio.folioLineas[i];
                // Recorremos los niveles ( El objeto que ya definimos para separar las órdenes)
                // para obtener los diferentes niveles que hay. 
                for (var nivel in ordenes) {
                    //Filtramos las órdenes 
                    linea.ordenes.filter(orden => {
                        // Si el nivel de urgencia coincide y tambien es el mismo depto. 
                        // OJO, SE HACE LA COMPROBACIÓN DOS VECES POR QUE ESTAMOS FILTRANDO 
                        // ARRIBA POR FOLIOS!!! Y NO POR ORDENES!! DE MANERA QUE TODAS LAS ÓRDENES DEL 
                        // FOLIO SE VAN A MOSTRAR!!! ESTEN EN EL DEPTO QUE ESTEN. 
                        if (orden.nivelDeUrgencia === nivel && orden.ubicacionActual.departamento.nombre === depto) {

                            var ordenO = orden.toObject();
                            ordenO.fechaFolio = folio.fechaFolio;

                            ordenO.modeloCompleto = linea.modeloCompleto;
                            ordenO.totalOrdenes = linea.ordenes.length;
                            ordenO.ordenViajera = `${folio.numeroDeFolio}-${i+1}-${orden.numeroDeOrden}`;
                            ordenO.laserCliente = linea.laserCliente;
                            ordenO.observacionesFolio = folio.observaciones;


                            ordenes[nivel].push(ordenO);
                            return true;
                        }
                        return false;
                    });

                    // Ordenamos por fecha cada nivel. 
                    ordenes[nivel].sort((a, b) => {
                        return a.fechaFolio - b.fechaFolio;
                    });
                }
            }
        }

        return RESP._200(res, null, [
            { tipo: 'ordenes', datos: ordenes },
        ]);


    }).catch(err => {
        return RESP._500(res, {
            msj: 'Hubo un error buscando las órdenes del departamento ',
            err: err,
        });
    });

});

// ============================================
// Guarda todas las órdenes. 
// ============================================

app.post('/', (req, res, next) => {

    var datos = req.body;
    Folio.findById(datos.idFolio, (err, folioEncontrado) => {
        // TODO: Mover a catch.
        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar folio.',
                errors: err
            });
        }

        if (!folioEncontrado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Error al buscar folio.',
                errors: 'El folio no existe'
            });
        }

        // Buscamos cada coincidencia de id de linea para
        // guardar los órdenes. 
        datos.folioLineas.forEach(lineaN => {

            // Buscamos dentro del folio una linea que coincida. 
            folioEncontrado.folioLineas.forEach(lineaParaActualizar => {

                if (lineaParaActualizar._id == lineaN._id) {
                    lineaParaActualizar.ordenesGeneradas = true;
                    lineaParaActualizar.ordenes = lineaN.ordenes;
                    return;
                }
            });

            // var lineaF = folioEncontrado.folioLineas.filter(l => { return linea._id === l._id; });
            // lineaF.ordenes = linea.ordenes;

        });
        // IMPORTANTE!!! El save lanza un pre en el modelo que
        // calcula el nivel de importancia del todo el folio. Por favor
        // no modifiques por otro sin antes revisar lo que estas haciendo. 
        folioEncontrado.save((err, folioGrabado) => {

            if (err) {
                console.log(err);
                return RESP._500(res, {
                    msj: 'Hubo un error grabando el folio.',
                    err: err,
                });
            }
            return RESP._200(res, 'Se guardo el folio correctamente.', [
                { tipo: 'folio', datos: folioGrabado },
            ]);
        });
    });
});

// ============================================
// Modifica una órden para agregarle un registro.
// ============================================

app.put('/:idOrden', (req, res) => {
    //Hay que saber para que depto es.
    let depto = req.query.depto;

    //Este camino modificado debe ser 
    // intercepado por el guard y si no es un usuario 
    // con permiso suficiente no se debe ejecutar este
    // controller. 
    const caminoModificadoAutorizado = req.query.caminoModificado;

    depto = depto.replace(/\'/g, '');
    const datos = req.body;

    // Obtenemos el id de la órden.
    const id = req.params.idOrden;
    console.log('Estamos aquí');

    Promise.all([
        existeFolioConOrden(id),
        existeDepartamento(depto)
    ]).then(respuestas => {
        const folio = respuestas[0];
        const departamento = respuestas[1];
        console.log('Dentor de la promesa.');


        const orden = buscarOrdenDentroDeFolio(folio, id);
        if (CONST.DEPARTAMENTOS.hasOwnProperty(depto.toUpperCase())) {

            // ============================================
            // AQUI ES DONDE SE AVANZA EN LA ORDEN
            // ============================================

            // schemaParaOrden[depto](orden, datos, departamento);
            datosDeOrdenYAvanzar(orden, datos, depto.toLowerCase());


            // ============================================
            //  TODO: OJO!!! ESTA PARTE TODAVÍA NO ESTA FUNCIONANDO.
            // ============================================

            // NO BORRAR!!!! NO BORRAR!!!!!!


            let datosTransformacion = {
                orden: orden,
                departamento: departamento,
                res: res,
                callback: function() {
                    //Ejecutamos el grabado dentro de la función asincrona que esta en asignar máquina. 
                    folio.save(err => {
                        if (err) {
                            return RESP._500(res, {
                                msj: 'Hubo un error actualizando el folio.',
                                err: err,
                            });

                        }

                        // return res.status(200).json({
                        //     ok: true,
                        // });
                        return RESP._200(res, 'Órden modificada correctamente.', [
                            { tipo: 'todoCorrecto', datos: true },
                        ]);
                    });

                }
            };


            if (!datosTransformacion.orden.ubicacionActual) {
                //Si no tenemos más ubicaciónes entonces no es necesario 
                // que hagamos la parte de transformación. 
                datosTransformacion.orden.terminada = true;
                datosTransformacion.callback();
            } else {
                asingarAMaquinaTransformacion(datosTransformacion);
            }
        } else {
            return RESP._500(res, {
                msj: 'Departamento no defindo como funcón en sistema. ',
                err: err,
                masInfo: [
                    { infoAdicional: 'sys', dataAdicional: 'Es necesario definir una operación en el sistema para que se guarda en su respectivo schema. ' }
                ]
            });


        }
    }).catch(err => {
        console.log(err);

        return RESP._500(res, err);
    });


});


function datosDeOrdenYAvanzar(orden, datos, depto) {
    orden.ubicacionActual[depto] = datos;
    avanzarCamino(orden);
}


function avanzarCamino(orden, depto) {
    // Obtenemos la ubicacion actual. 
    const ubicacionActual = orden.ubicacionActual;

    // Obtenemos el siguiente departamento desde el trayecto 
    // normal.
    for (let i = 0; i < orden.trayectoNormal.length; i++) {
        const trayecto = orden.trayectoNormal[i];

        // Revisamos si estamos en este trayecto
        if (trayecto.orden === ubicacionActual.orden) {
            // Damos la salida.
            ubicacionActual.salida = new Date();
            // Si estamos en este trayecto entonces guardamos la ubicación actual
            // como trayecto recorrido
            orden.trayectoRecorrido.push(ubicacionActual);
            orden.ubicacionActual = orden.siguienteDepartamento;
            //No se da entrada por que hay que recivir la órden. 


            // Si hay todavía un departamento en el trayecto normal
            // entonces si ponemos siguiente departamento, si no, 
            // lo dejamos así.
            if ((orden.trayectoRecorrido.length >= orden.trayectoNormal.length)) {
                orden.terminada = true;

                return;
            } else {
                console.log('[IMPORTANTE]  =>>> Hay todavía trayecto NORMAL: ' + JSON.stringify(orden.trayectoNormal[i + 2]));
                console.log('Trayecto recorrido tama: ' + orden.trayectoRecorrido.length);
                orden.siguienteDepartamento = orden.trayectoNormal[i + 2];

            }


            return;
        }
    }

}




function asingarAMaquinaTransformacion(datos) {
    //Comprobamos que el trayecto actual se corresponda a 
    // TRANSFORMACIÓN.

    const DEPTO = CONST.DEPARTAMENTOS.TRANSFORMACION._n;

    let maquinasconProduccion = [];
    let maquinasSinProduccion = [];


    // UbicacionActual = TRANSFORMACION
    if (datos.orden.ubicacionActual.departamento.nombre === DEPTO) {
        // Buscar máquinas asigandas a transformacion
        Maquina.find({ departamentos: DEPTO }, (err, maquinasTransformacion) => {

            if (err) {
                return RESP._500(datos.res, {
                    msj: 'Hubo un error buscando las máquinas.',
                    err: err
                });
            }

            // Hay máquinas?
            if (!maquinasTransformacion) {
                RESP._400(res, {
                    msj: 'No hay máquinas asignadas a ' + DEPTO,
                    err: 'Es necesario asignar máquinas a este departamento.',
                    masInfo: [{
                        infoAdicional: CONST.ERRORES.MAS_INFO.TIPO_ERROR.NO_DATA.infoAdicional,
                        dataAdicional: CONST.ERRORES.MAS_INFO.TIPO_ERROR.NO_DATA.dataAdicional
                    }]
                });
            }

            //Separar por las que tienen producción. 
            maquinasConProduccion = maquinasTransformacion.filter(maquina => maquina.ordenes.length > 0);

            //Maquinas que no tiene producción. 
            maquinasSinProduccion = maquinasTransformacion.filter(maquina => maquina.ordenes.length === 0);

            if (maquinasConProduccion > 0) {

                //Agregamos máquina con pedido igual.
                let maquinasConPedidoIgual = [];
                maquinasConPedidoIgual = maquinasConProduccion.filter(maquina => {

                    for (let i = 0; i < maquina.ordenes.length; i++) {
                        const orden = maquina.ordenes[i];
                        return orden.pedido === datos.orden.pedido;
                    }

                });

                //¿Hay maquinas con pedido igual?
                if (maquinasConPedidoIgual > 0) {
                    filtrarMaquina(maquinasConPedidoIgual, datos);
                } else {
                    // Tomamos una máquina con producción. 
                    let maquinaConModeloIgual = [];
                    maquinaConModeloIgual = maquinasConProduccion.filter(maquina => {
                        for (let i = 0; i < maquina.ordenes.length; i++) {
                            const orden = maquina.ordenes[i];
                            return orden.modeloCompleto === datos.orden.modeloCompleto;
                        }
                    });

                    //¿Hay máquinas con modeloIgual?
                    if (maquinaConModeloIgual > 0) {
                        filtrarMaquina(maquinaConModeloIgual, datos);
                    } else {
                        // Tomamos una máquina con proudcción. 
                        let maquinaConTamanoIgual = [];
                        maquinaConTamanoIgual = maquinasconProduccion.filter(maquina => {
                            for (let i = 0; i < maquina.ordenes.length; i++) {
                                const orden = maquina.ordenes[i];
                                return orden.modeloCompleto.tamano.tamano === datos.orden.modeloCompleto.tamano.tamano;
                            }
                        });

                        // ¿Hay máquinas con tamaño igual?
                        if (maquinaConTamanoIgual > 0) {
                            filtrarMaquina(maquinaConTamanoIgual, datos);
                        } else {
                            //Tomamos una máquina de producción
                            datos.maquina = maquinasSinProduccion[0];
                            anadirOrdenAMaquinaYGrabar(datos);
                        }
                    }
                }
            } else {
                //Tomamos una máquina sin producción
                datos.maquina = maquinasSinProduccion[0];
                anadirOrdenAMaquinaYGrabar(datos);
            }
        });
    } else {
        // FIN
        //Si no es el departamento que nos interesa ejecutamos la función de grabado.
        datos.callback();
    }
}

function anadirOrdenAMaquinaYGrabar(datos) {

    // Añadimos la órden a la máquina.
    Maquina.findOne({ _id: datos.maquina._id }, (err, maquinaParaModificar) => {

        return RESP._500(datos.res, {
            msj: 'Hubo un error buscando la máquina.',
            err: err,
        });

        maquinaParaModificar.ordenes.push(datos.orden);
        // Añadimos la máquina actual a la órden. 
        orden.maquinaActual = maquinaParaModificar;
        // Guardamos los cambios echos en la máquina. 
        maquinaParaModificar.save(err => {
            if (err) {
                return RESP._500(datos.res, {
                    msj: 'Hubo un error guardando las modificaciones de la máquina',
                    err: err,
                });
            }
            //FIN
            datos.callback();
        });

    });
}

function filtrarMaquina(arrayDeMaquinas, datos) {
    // Filtramos la máquina con menor cantidad de órdenes.
    let maquinaConMenorCantidadDeOrdenes =
        arrayDeMaquinas.sort(
            (a, b) => {
                return a.ordenes.length - b.ordenes.length;
            })[0];
    datos.maquina = maquinaConMenorCantidadDeOrdenes;
    anadirOrdenAMaquinaYGrabar(datos);

}

// Esto exporta el modulo para poderlo utilizarlo fuera de este archivo.
module.exports = app;