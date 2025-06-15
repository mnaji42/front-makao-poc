// src/lib/ipfsUploader.js

import { NFTStorage, File } from "nft.storage"

// On récupère la clé API depuis les variables d'environnement.
const NFT_STORAGE_KEY = process.env.NEXT_PUBLIC_NFT_STORAGE_KEY

/**
 * Uploade les métadonnées d'un marché sur IPFS via nft.storage.
 * @param {string} title - Le titre du marché.
 * @param {string} description - La description du marché.
 * @param {File} imageFile - Le fichier image (optionnel).
 * @param {Array<object>} events - Le tableau des options de pari (ex: [{ title: "Oui" }, { title: "Non" }]).
 * @returns {Promise<string>} Le hash IPFS (CID) des métadonnées.
 */
export async function uploadMarketMetadata(
  title,
  description,
  imageFile,
  events
) {
  console.log("Préparation des métadonnées pour l'upload sur IPFS...")

  // 1. Initialiser le client nft.storage
  const client = new NFTStorage({ token: NFT_STORAGE_KEY })

  // 2. Créer l'objet de métadonnées
  const metadata = {
    title: title,
    description: description,
    image: imageFile, // La bibliothèque gère l'upload de l'image directement
    events: events,
  }

  // 3. Uploader les métadonnées. La bibliothèque va :
  //    - Uploader l'image sur IPFS si elle existe.
  //    - Créer un fichier JSON avec le titre, la description, et le lien vers l'image.
  //    - Uploader ce fichier JSON sur IPFS.
  //    - Retourner un objet contenant le CID final et d'autres informations.
  console.log("Upload en cours...")
  const result = await client.store(metadata)

  console.log("Upload réussi !")
  console.log("Résultat de nft.storage :", result)

  // 4. Retourner le hash IPFS (CID) des métadonnées.
  // C'est ce hash que tu vas stocker dans ton smart contract.
  return result.ipfshash
}
