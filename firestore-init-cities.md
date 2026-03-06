# Inicializar Coleção `cities` no Firestore

## Como criar as 4 cidades iniciais

### Opção 1: Firebase Console (Manual)

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto `prontto-60341`
3. Vá em **Firestore Database**
4. Clique em **+ Iniciar coleção**
5. Digite `cities` como ID da coleção
6. Adicione os documentos abaixo:

---

#### Documento 1: `diamantina`
```json
{
  "nome": "Diamantina",
  "uf": "MG",
  "slug": "diamantina",
  "status": "ativa",
  "ordem": 1,
  "created_at": [Campo tipo Timestamp - usar valor atual]
}
```

#### Documento 2: `datas`
```json
{
  "nome": "Datas",
  "uf": "MG",
  "slug": "datas",
  "status": "ativa",
  "ordem": 2,
  "created_at": [Campo tipo Timestamp - usar valor atual]
}
```

#### Documento 3: `gouveia`
```json
{
  "nome": "Gouveia",
  "uf": "MG",
  "slug": "gouveia",
  "status": "ativa",
  "ordem": 3,
  "created_at": [Campo tipo Timestamp - usar valor atual]
}
```

#### Documento 4: `couto-magalhaes-de-minas`
```json
{
  "nome": "Couto de Magalhães de Minas",
  "uf": "MG",
  "slug": "couto-magalhaes-de-minas",
  "status": "ativa",
  "ordem": 4,
  "created_at": [Campo tipo Timestamp - usar valor atual]
}
```

---

### Opção 2: Script Node.js (Automático)

Crie um arquivo `init-cities.js` na raiz do projeto:

```javascript
const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json') // baixe do Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const cities = [
  {
    id: 'diamantina',
    nome: 'Diamantina',
    uf: 'MG',
    slug: 'diamantina',
    status: 'ativa',
    ordem: 1,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: 'datas',
    nome: 'Datas',
    uf: 'MG',
    slug: 'datas',
    status: 'ativa',
    ordem: 2,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: 'gouveia',
    nome: 'Gouveia',
    uf: 'MG',
    slug: 'gouveia',
    status: 'ativa',
    ordem: 3,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: 'couto-magalhaes-de-minas',
    nome: 'Couto de Magalhães de Minas',
    uf: 'MG',
    slug: 'couto-magalhaes-de-minas',
    status: 'ativa',
    ordem: 4,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  }
]

async function initCities() {
  console.log('🏙️  Iniciando criação de cidades...')
  
  for (const city of cities) {
    const { id, ...data } = city
    await db.collection('cities').doc(id).set(data)
    console.log(`✅ Criada: ${data.nome}`)
  }
  
  console.log('\n✨ Todas as cidades foram criadas com sucesso!')
  process.exit(0)
}

initCities().catch(err => {
  console.error('❌ Erro:', err)
  process.exit(1)
})
```

Execute:
```bash
node init-cities.js
```

---

## Regras de Segurança Firestore

Adicione estas regras no Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Cidades: público lê, só admin escreve
    match /cities/{cityId} {
      allow read: if true; // qualquer um pode ler cidades
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin']);
    }
  }
}
```

---

## Estrutura da Coleção

```
cities (coleção)
├── diamantina (documento)
│   ├── nome: "Diamantina"
│   ├── uf: "MG"
│   ├── slug: "diamantina"
│   ├── status: "ativa"
│   ├── ordem: 1
│   └── created_at: Timestamp
├── datas (documento)
│   └── ...
├── gouveia (documento)
│   └── ...
└── couto-magalhaes-de-minas (documento)
    └── ...
```

---

## Validação

Após criar as cidades, verifique:

1. **Firebase Console**: Veja se a coleção `cities` aparece com 4 documentos
2. **AdminPanel**: Acesse `/admin` → Aba "🏙️ Cidades" → Deve mostrar as 4 cidades
3. **CitySelectorNav**: O dropdown deve listar só cidades ativas

---

## Próximos Passos

1. ✅ Criar coleção `cities` (este arquivo)
2. 🔄 Atualizar `CitySelectorNav` para usar `useCities()`
3. 🔄 Adicionar seletor de cidades em "meu-perfil" do prestador
4. 🔄 Filtrar prestadores por cidade na busca
