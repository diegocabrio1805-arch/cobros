# 🛡️ Ciberseguridad de Clase Mundial: Anexo Cobro

Este documento detalla las medidas de seguridad implementadas en la plataforma **Anexo Cobro**, diseñadas bajo los mismos estándares de criptografía y protección de datos utilizados por entidades financieras líderes como **BBVA**.

---

## 1. RLS (Row Level Security): La Bóveda Digital Individual

**Metáfora Bancaria:** Una caja de seguridad personal dentro de una bóveda acorazada.

En el sistema tradicional, si alguien entra a la oficina, podría ver todos los papeles. En **Anexo Cobro**, implementamos **RLS**.

* **Seguridad:** Cada dato tiene un "dueño". El servidor de base de datos de Supabase actúa como un guardia armado que verifica la identidad antes de permitir siquiera *ver* la existencia de un registro.
* **Beneficio:** Un cobrador jamás podrá ver la cartera de otro a menos que el Gerente lo autorice explícitamente desde el núcleo del servidor.

---

## 2. JWT (JSON Web Tokens): La Tarjeta de Coordenadas Digital

**Metáfora Bancaria:** El Token de Seguridad o Tarjeta de Claves.

Cada vez que inicias sesión, se genera un "Pasaporte Digital" único y efímero llamado **JWT**.

* **Seguridad:** Este token está firmado con una llave maestra que solo el servidor conoce. Es imposible de falsificar.
* **Beneficio:** Evita el robo de identidad por "session hijacking". Si el token no es válido o expira, el sistema bloquea el acceso de inmediato, igual que una banca móvil.

---

## 3. SSL/TLS: El Túnel Acorazado de Datos

**Metáfora Bancaria:** El Camión de Caudales Blindado.

Toda la información que viaja desde el celular del cobrador hasta la nube lo hace a través de un canal de **256 bits**.

* **Seguridad:** Encriptación de punto a punto. Si un atacante intercepta la señal de Wi-Fi, solo recibirá ruido digital basura.
* **Beneficio:** Tus datos financieros viajan por internet con la misma protección que una transferencia interbancaria internacional.

---

## 4. Infraestructura en la Nube: La Fortaleza de Datos

**Metáfora Bancaria:** Los Centros de Cómputo Blindados.

**Anexo Cobro** reside en la infraestructura de **Supabase (AWS/Google Cloud)**, distribuida globalmente.

* **Seguridad:** Protección contra ataques DDoS, firewalls inteligentes y copias de seguridad cada hora.
* **Beneficio:** Máxima disponibilidad. Tu negocio nunca se detiene y tus datos están respaldados ante cualquier desastre físico.

---

> [!IMPORTANT]
> **Certificación de Integridad:** El uso de PostgreSQL como núcleo garantiza que cada transacción (cobro, préstamo, cierre) sea ACID (Atómica, Consistente, Aislada y Duradera), el estándar de oro de la informática financiera.
