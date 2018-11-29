var RESP = require('../utils/respStatus');
var _CONST = require('../utils/constantes');
var jwt = require('jsonwebtoken');
var SEED = require('../config/config').SEED;
var _ROUTES = require('../config/routes');
var colores = require('../utils/colors');

// Este modulo se encarga de administrar los permisos
// de los usuarios para permitir la ejecución o no de las rutas. 


function esLogin(url) {
    const urlLogin = url.split('/')[1].split('?')[0];
    return `/${urlLogin}` === _ROUTES.ROUTES._LOGIN.url;
}

function token(req, res, next) {

    // Si es login no comprobamos nada. 
    if (esLogin(req.originalUrl)) {
        next();
        return;
    }
    // Si existe este parametro en el req quiere
    // decir que ya ejecutamos al primera capa de
    // seguridad general.
    if (req.usuario) {
        next();
        return;
    }

    var token = req.token;

    console.log('token =>' + token);

    jwt.verify(token, SEED, (err, decode) => {

        if (err) {
            return RESP._401(res, {
                msj: 'Login incorrecto.',
                err: 'Es necesario iniciar sesion en el sistema.',
            });
        }

        // Colocar la información del usuario en 
        // cualquier petición. Lo extraemos del decode.
        req.usuario = decode.usuario;
        next();
    });
};

function obtenerRolesEnFuncionDeUrl(req, res) {


    var rolesDeLaURL = [];
    var url = req.originalUrl.split('?')[0];


    var pathPrincipal = '_' + url.split('/')[1];
    console.log(pathPrincipal.toUpperCase());

    if (_ROUTES.ROUTES.hasOwnProperty(pathPrincipal.toUpperCase())) {
        const route = _ROUTES.ROUTES[pathPrincipal.toUpperCase()];
        // Existe la ruta principal
        // Agregamos sus roles. 
        rolesDeLaURL.concat(route.roles);
    }
    console.log(colores.warning('PERMISOS DE RUTA') + colores.info(url) + rolesDeLaURL);
    return rolesDeLaURL;
}

function obtenerRolesEnFuncionDePATH(req, res, path) {
    console.log('Ejecutando roles en funcion de path:' + path);
    const pahtConvertido = path.replace('/', '_').toUpperCase();
    // Existe la ruta?
    if (_ROUTES.ROUTES.hasOwnProperty(pahtConvertido)) {


    }
};

// exports.PERMISOS_2_LV = function (path) {
//     console.log('Ejecutando permisos de segundo nivel en path:' + path);
//     return this.PERMISOS(path);
// }

exports.PERMISOS = function(PATH) {
    console.log('Esta comprobando los permisos. ');
    return [token, function(req, res, next) {
        if (esLogin(req.originalUrl)) {
            next();
            return;
        }

        var ROLES_REQUERIDOS;
        // Si tenemos este dato siginifica que estamos en 
        // la segunda capa de seguirdad, solo hay que buscar 
        // la propiedad correspondiente.
        if (PATH) {
            ROLES_REQUERIDOS = obtenerRolesEnFuncionDePATH(req, res, path);
        } else {
            ROLES_REQUERIDOS = obtenerRolesEnFuncionDeUrl(req, res);
        }

        console.log('Dentro del request ');
        const USUARIO_LOGUEADO = req.usuario;
        const PERMISOS_DE_USUARIO = USUARIO_LOGUEADO.role;

        if (PERMISOS_DE_USUARIO.length === 0 || ROLES_REQUERIDOS.length === 0) {
            console.log(colores.danger('SIN PERMISOS') + colores.info('Parece que el usuario que se esta logueando no tiene permisos de ningun tipo o la ruta no ha sido definida con sus permisos. '));
            // No se puede ingresar al sistema si la ruta no tiene permisos
            // o si el usuario no tiene permisos. Es necesario que ambos 
            // los tengan para poder acceder. 
            return RESP._401(res, {
                msj: 'No tienes los permisos necesarios para esta petición.',
                err: 'Reportaselo a tu administrador.',
                autorizado: false
            });
        }

        console.log('Dentro del request 2');
        // Si es super-admin no hace la comprobación. 
        if (PERMISOS_DE_USUARIO.includes(_CONST.ROLES.SUPER_ADMIN)) {
            next();
        } else {

            console.log('Dentro del request 3');
            // Comprobamos que el usuario tenga todos los permisos
            //  que son necesarios.
            ROLES_REQUERIDOS.forEach(role => {
                console.log('Dentro del request 4');
                if (!PERMISOS_DE_USUARIO.includes(role)) {
                    console.log('Dentro del request 5');
                    return RESP._401(res, {
                        msj: 'No tienes los permisos necesarios para esta petición.',
                        err: 'ROLES REQUERIDOS : ' + ROLES_REQUERIDOS,
                        autorizado: false
                    });
                }
            });
            console.log('Dentro del request 7');
            next();
        };

    }];

};