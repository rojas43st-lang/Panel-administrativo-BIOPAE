# BIOPAE1 integrado

Este directorio contiene las rutas, plantillas y recursos estáticos del módulo
BIOPAE1. El módulo se monta en la aplicación FastAPI de la raíz del repositorio;
usa su conexión configurada en `DATABASE_URL` y sus dependencias de
`../requirements.txt`.

Ejecuta y despliega únicamente la aplicación raíz. No ejecutes el antiguo
servidor ni mantengas una configuración de despliegue independiente para este
módulo.