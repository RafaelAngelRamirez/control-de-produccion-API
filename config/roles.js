const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN_ROLE: "ADMIN_ROLE",
  USER_ROLE: "USER_ROLE",

  CONTROL_DE_PRODUCCION_REGISTRAR_FOLIOS_ROLE:
    "CONTROL_DE_PRODUCCION_REGISTRAR_FOLIOS_ROLE",
  CONTROL_DE_PRODUCCION_CONSULTAR_FOLIOS_ROLE:
    "CONTROL_DE_PRODUCCION_CONSULTAR_FOLIOS_ROLE",

  VENDEDOR_ROLE: "VENDEDOR_ROLE",
  VENDEDOR_ADMIN_ROLE: "VENDEDOR_ADMIN_ROLE",
  VENDEDOR_CONSULTA_ROLE: "VENDEDOR_CONSULTA_ROLE",

  MATERIALES_REGISTRO_ROLE: "MATERIALES_REGISTRO_ROLE",
  MATERIALES_CARGA_ROLE: "MATERIALES_CARGA_ROLE",

  PASTILLA_REGISTRO_ROLE: "PASTILLA_REGISTRO_ROLE",
  TRANSFORMACION_REGISTRO_ROLE: "TRANSFORMACION_REGISTRO_ROLE",
  PULIDO_REGISTRO_ROLE: "PULIDO_REGISTRO_ROLE",

  SELECCION_REGISTRO_ROLE: "SELECCION_REGISTRO_ROLE",
  SELECCION_CONTEO_ROLE: "SELECCION_CONTEO_ROLE",

  EMPAQUE_REGISTRO_ROLE: "EMPAQUE_REGISTRO_ROLE",
  EMPAQUE_EMPACADOR_ROLE: "EMPAQUE_EMPACADOR_ROLE",

  FOLIO_CONSULTAR: "FOLIO_CONSULTAR_ROLE",

  //NUEVOS ROLES.... SON ACUMULATIVOS.
  REPORTES_MENU: "REPORTES_MENU",
  REPORTES_HISTORIAL_DE_FOLIOS: "REPORTES_HISTORIAL_DE_FOLIOS",
  REPORTES_LASER: "REPORTES_LASER",
  REPORTES_TRANSFORMACION: "REPORTES_TRANSFORMACION",
  REPORTES_QUIMICA: "REPORTES_QUIMICA",

  CONTROL_DE_PRODUCCION_MENU: "CONTROL_DE_PRODUCCION_MENU",
  CONTROL_DE_PRODUCCION_REVISION_DE_FOLIOS:
    "CONTROL_DE_PRODUCCION_REVISION_DE_FOLIOS",
  CONTROL_DE_PRODUCCION_SEGUIMIENTOS: "CONTROL_DE_PRODUCCION_SEGUIMIENTOS",

  INGENIERIA_MENU: "INGENIERIA_MENU",
  INGENIERIA_PROCESOS: "INGENIERIA_PROCESOS",
  INGENIERIA_FAMILIA_DE_PROCESOS: "INGENIERIA_FAMILIA_DE_PROCESOS",
  INGENIERIA_MODELOS: "INGENIERIA_MODELOS",
  INGENIERIA_TAMANOS: "INGENIERIA_TAMANOS",
  INGENIERIA_COLORES: "INGENIERIA_COLORES",
  INGENIERIA_TERMINADOS: "INGENIERIA_TERMINADOS",
  INGENIERIA_MODELOS_COMPLETOS: "INGENIERIA_MODELOS_COMPLETOS",
  INGENIERIA_MAQUINAS: "INGENIERIA_MAQUINAS",

  VENTAS_MENU: "VENTAS_MENU",
  VENTAS_MIS_FOLIOS: "VENTAS_MIS_FOLIOS",
  VENTAS_STOCK: "VENTAS_STOCK",
  

  ADMINISTRADOR_MENU: "ADMINISTRADOR_MENU",
  ADMINISTRADOR_USUARIOS: "ADMINISTRADOR_USUARIOS",
  ADMINISTRADOR_CLIENTES: "ADMINISTRADOR_CLIENTES",
  ADMINISTRADOR_ALMACEN_DESCRIPCION: "ADMINSTRADOR_ALMACEN_DESCRIPCION",
  ADMINISTRADOR_FOLIOS_ELIMINAR_POR_COMPLETO: "ADMINSTRADOR_FOLIOS_ELIMINAR_POR_COMPLETO",


  PRODUCCION_MENU: "PRODUCCION_MENU",

  PRODUCCION_ALMACEN_DE_BOTON: "PRODUCCION_ALMACEN_DE_BOTON",
  PRODUCCION_BARNIZADO: "PRODUCCION_BARNIZADO",
  PRODUCCION_BURATO: "PRODUCCION_BURATO",
  PRODUCCION_CONTROL_DE_PRODUCCION: "PRODUCCION_CONTROL_DE_PRODUCCION",
  PRODUCCION_EMPAQUE: "PRODUCCION_EMPAQUE",
  PRODUCCION_MATERIALES: "PRODUCCION_MATERIALES",
  PRODUCCION_PASTILLA: "PRODUCCION_PASTILLA",
  PRODUCCION_LASER: "PRODUCCION_LASER",
  PRODUCCION_METALIZADO: "PRODUCCION_METALIZADO",
  PRODUCCION_SELECCION: "PRODUCCION_SELECCION",
  PRODUCCION_TRANSFORMACION: "PRODUCCION_TRANSFORMACION",
  PRODUCCION_PULIDO: "PRODUCCION_PULIDO",
  PRODUCCION_PRODUCTO_TERMINADO: "PRODUCCION_PRODUCTO_TERMINADO",
  PRODUCCION_TENIDO: "PRODUCCION_TENIDO",

  ALMACEN_MENU: "ALMACEN_MENU",
  ALMACEN_PRODUCTO_TERMINADO: "ALMACEN_PRODUCTO_TERMINADO",
  //  eSTOS TODAVIA NO SE IMPLEMENTAN
  ALMACEN_MATERIA_PRIMA: "ALMACEN_MATERIA_PRIMA",
  ALMACEN_REFACCIONES: "ALMACEN_REFACCIONES",
  ALMACEN_HERRAMIENTAS: "ALMACEN_HERRAMIENTAS"
}

ROLES.ARRAY = Object.values(ROLES)

module.exports = ROLES
