var jwt = require('jsonwebtoken');
var SEED = require('../config/config').SEED;
var CONST = require('../utils/constantes');
var RESP = require('../utils/respStatus');

function contieneElRole(usuario, role) {
    return usuario.role.includes(role);
}

function comprobarQueUnUsuarioNormalNoSeCambioElRole(usuario, rolesModificados) {
    if (
        // Es un usuario normal, sin super poderes.
        (!usuario.role.include(CONST.ADMIN_ROLE) &&
            !usuario.role.include(CONST.SUPER_ADMIN)) &&
        // Sus roles no deben ser difererntes
        rolesNoDebenSerDiferentes(usuario, rolesModificados)
    ) {
        return true;
    }
    return false;
}

function rolesNoDebenSerDiferentes(usuario, rolesModificados) {
    // Ambos arreglos deben de medir lo mismo. 
    if (usuario.role.length !== rolesModificados.length) {
        // El usuario modifico sus roles. 
        return false;
    }
    // Los roles deben ser los mismos aun despues de unirlos, 
    // si hay uno de más siginifica que el usuario esta 
    // intentando modificar sus roles. 
    var a = rolesModificados.concat(usuario.role);
    a.unique();
    return a.length === usuario.role.length;

}

// ============================================
// Verificar token.
// ============================================
exports.verificarToken = function(req, res, next) {

    var token = req.query.token;
    jwt.verify(token, SEED, (err, decode) => {

        if (err) {
            return RESP._401(res, {
                msj: 'Token incorrecto.',
                err: 'El token recivo no es válido.',
            });
        }

        // Colocar la información del usuario en 
        // cualquier petición. Lo extraemos del decode.
        req.usuario = decode.usuario;
        next();

    });
};

// ============================================
// Verificar ADMIN.
// ============================================
exports.verificarADMIN_ROLE = function(req, res, next) {
    var usuario = req.usuario;
    if (
        contieneElRole(usuario, CONST.ROLES.ADMIN_ROLE) ||
        contieneElRole(usuario, CONST.ROLES.SUPER_ADMIN)
    ) {
        next();
        return;
    } else {
        return RESP._401(res, {
            msj: 'Token incorrecto --Quitar | No es admin - ni mismo usuario.',
            err: 'No es administrador, no puede hacer eso.',
        });
    }
};


// ============================================
// Verificar ADMIN o Mismo USuario
// ============================================
exports.verificarADMIN_o_MismoUsuario = function(req, res, next) {
    var usuario = req.usuario;
    //Este tiene que vernid de la petición que se recive, 
    // en este caso la vamos a recivir desde el put. 
    var id = req.params.id;
    var superPoderes =
        contieneElRole(usuario, CONST.ROLES.ADMIN_ROLE) ||
        contieneElRole(usuario, CONST.ROLES.SUPER_ADMIN);
    if (superPoderes ||
        usuario._id === id) {
        next();
        return;
    } else {
        return RESP._401(res, {
            msj: 'Token incorrecto --Quitar | No es admin - ni mismo usuario.',
            err: 'No eres administrador, no puedes hacer eso.',
        });

    }
};

exports.verificarNoCambioDeADMIN_ROLE = function(req, res, next) {

    // Para porder cambiar el roLE debe ser admin o super admin. 
    // Este viene con el token valido. 
    var usuario = req.usuario;
    var rolesModificados = req.body.role;

    // Si es admin o super admin entonces no se necesita revisar los
    // siguientes pasos de la validación. Como ya revisamos que no es 

    if (
        contieneElRole(usuario, CONST.ROLES.ADMIN_ROLE) ||
        contieneElRole(usuario, CONST.ROLES.SUPER_ADMIN)
    ) {
        // Esta comprobación no es necesaria cuando es el administrador. 
        next();
        return;
    }


    if (comprobarQueUnUsuarioNormalNoSeCambioElRole(usuario, rolesModificados)) {
        next();
        return;
    } else {
        return RESP._401(res, {
            msj: 'Token incorrecto. --Quitar | No es admin - ni mismo usuario.',
            err: 'No puedes cambiar tu role. Comuicate con un administrador.',
        });
    }
};