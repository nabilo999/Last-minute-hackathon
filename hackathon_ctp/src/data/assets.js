const characterModules = import.meta.glob(
  '../assets/characters/*.{png,jpg,jpeg,webp,svg}',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
)

const placeModules = import.meta.glob('../assets/places/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
  query: '?url',
})

function humanizeFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function createAssetRegistry(modules) {
  return Object.fromEntries(
    Object.entries(modules).map(([filePath, imageUrl]) => {
      const filename = filePath.split('/').pop()
      const key = filename.replace(/\.[^.]+$/, '').toLowerCase()

      return [
        key,
        {
          key,
          filename,
          label: humanizeFilename(filename),
          imageUrl,
        },
      ]
    }),
  )
}

export const CHARACTER_ASSETS = createAssetRegistry(characterModules)
export const PLACE_ASSETS = createAssetRegistry(placeModules)

export const UNKNOWN_CHARACTER_ASSET = {
  key: 'unknown',
  label: 'Unknown',
  imageUrl: '',
}

export const UNKNOWN_PLACE_ASSET = {
  key: 'unknown',
  label: 'Unknown Place',
  imageUrl: '',
}

export const AVAILABLE_CHARACTER_ASSETS = Object.values(CHARACTER_ASSETS)
export const AVAILABLE_PLACE_ASSETS = Object.values(PLACE_ASSETS)

export const ASSET_POOL = {
  characters: AVAILABLE_CHARACTER_ASSETS,
  places: AVAILABLE_PLACE_ASSETS,
}

export function getCharacterAsset(assetKey) {
  return CHARACTER_ASSETS[assetKey] ?? UNKNOWN_CHARACTER_ASSET
}

export function getPlaceAsset(assetKey) {
  return PLACE_ASSETS[assetKey] ?? UNKNOWN_PLACE_ASSET
}
