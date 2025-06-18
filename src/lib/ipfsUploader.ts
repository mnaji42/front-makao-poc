// Configuration pour l'API IPFS RPC de Filebase
const FILEBASE_RPC_URL = "https://rpc.filebase.io"
const API_KEY = process.env.NEXT_PUBLIC_FILEBASE_API_KEY

async function announceCidToNetwork(cid: string) {
  if (!cid) return

  console.log(`Annonce du CID ${cid} sur le réseau IPFS...`)

  // Liste de passerelles publiques et rapides
  const gateways = [
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
  ]

  // On lance des requêtes à chaque passerelle pour forcer la mise en cache.
  // On n'a pas besoin d'attendre la réponse (fire and forget).
  gateways.forEach((gatewayUrl) => {
    fetch(gatewayUrl + cid)
      .then((res) => {
        if (res.ok) {
          console.log(`Annonce réussie sur ${gatewayUrl}`)
        } else {
          console.warn(`Annonce sur ${gatewayUrl} avec statut: ${res.status}`)
        }
      })
      .catch((err) =>
        console.error(`Échec de l'annonce sur ${gatewayUrl}:`, err)
      )
  })
}

export async function uploadToIPFS(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${FILEBASE_RPC_URL}/api/v0/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Erreur lors de l'upload IPFS")
  }

  const result = await response.json()

  return result.Hash
}

export async function uploadMarketMetadata(
  title: string,
  description: string,
  imageFile: File | null,
  events: Array<{ name: string; description: string }>
): Promise<string> {
  let imageUrl = ""

  if (imageFile && imageFile.size > 0) {
    const imageCID = await uploadToIPFS(imageFile)
    imageUrl = `ipfs://${imageCID}`
  }

  const metadata = {
    name: title,
    description: description,
    image: imageUrl,
    properties: { events },
  }

  const metadataBlob = new Blob([JSON.stringify(metadata)], {
    type: "application/json",
  })
  const metadataFile = new File([metadataBlob], "metadata.json")

  const metadataCID = await uploadToIPFS(metadataFile)
  // announceCidToNetwork(metadataCID)
  return metadataCID
}

// // Fichier : ipfsUploader.ts (Modifié pour Pinata)

// // --- ÉTAPE 1: Mettez à jour vos variables d'environnement ---
// // Assurez-vous d'avoir ces clés dans votre fichier .env.local
// const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY
// const PINATA_API_SECRET = process.env.NEXT_PUBLIC_PINATA_API_SECRET

// /**
//  * Uploade un fichier (ex: une image) sur Pinata.
//  * @param file Le fichier à uploader.
//  * @returns Le CID (hash IPFS) du fichier.
//  */
// async function uploadFileToPinata(file: File): Promise<string> {
//   const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`

//   const formData = new FormData()
//   formData.append("file", file)

//   console.log("Début de l'upload du fichier sur Pinata...")

//   const response = await fetch(url, {
//     method: "POST",
//     headers: {
//       pinata_api_key: PINATA_API_KEY!,
//       pinata_secret_api_key: PINATA_API_SECRET!,
//     },
//     body: formData,
//   })

//   if (!response.ok) {
//     const errorData = await response.text()
//     console.error("Erreur Pinata (Fichier):", errorData)
//     throw new Error("Erreur lors de l'upload du fichier sur Pinata")
//   }

//   const result = await response.json()
//   console.log("Fichier uploadé avec succès:", result)
//   return result.IpfsHash // La réponse de Pinata contient le hash dans "IpfsHash"
// }

// /**
//  * Uploade un objet JSON directement sur Pinata.
//  * C'est plus efficace que de créer un fichier localement.
//  * @param metadata L'objet JSON des métadonnées du marché.
//  * @returns Le CID (hash IPFS) du JSON.
//  */
// async function uploadJsonToPinata(metadata: object): Promise<string> {
//   const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`

//   console.log("Début de l'upload du JSON sur Pinata...")

//   const response = await fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       pinata_api_key: PINATA_API_KEY!,
//       pinata_secret_api_key: PINATA_API_SECRET!,
//     },
//     body: JSON.stringify({ pinataContent: metadata }),
//   })

//   if (!response.ok) {
//     const errorData = await response.text()
//     console.error("Erreur Pinata (JSON):", errorData)
//     throw new Error("Erreur lors de l'upload du JSON sur Pinata")
//   }

//   const result = await response.json()
//   console.log("JSON uploadé avec succès:", result)
//   return result.IpfsHash
// }

// /**
//  * Fonction principale qui orchestre l'upload des métadonnées du marché.
//  * @param title Le titre du marché.
//  * @param description La description du marché.
//  * @param imageFile Le fichier de l'image (optionnel).
//  * @param events Un tableau des événements associés au marché.
//  * @returns Le CID (hash IPFS) du fichier de métadonnées final.
//  */
// export async function uploadMarketMetadata(
//   title: string,
//   description: string,
//   imageFile: File | null,
//   events: Array<{ id: number; name: string; description: string }>
// ): Promise<string> {
//   let imageUrl = ""

//   // Uploader l'image si elle est fournie
//   if (imageFile && imageFile.size > 0) {
//     const imageCID = await uploadFileToPinata(imageFile)
//     imageUrl = `ipfs://${imageCID}`
//   }

//   // Préparer l'objet de métadonnées
//   const metadata = {
//     name: title,
//     description: description,
//     image: imageUrl,
//     properties: { events },
//   }

//   // Uploader l'objet de métadonnées JSON directement
//   const metadataCID = await uploadJsonToPinata(metadata)
//   return metadataCID // Retourner le chemin complet "ipfs://"
// }
