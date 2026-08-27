export const CHARACTER_ASSETS = {
  chef: {
    path: '/assets/characters/chef.png',
    label: 'Chef',
  },
  butler: {
    path: '/assets/characters/butler.png',
    label: 'Butler',
  },
  doctor: {
    path: '/assets/characters/doctor.png',
    label: 'Doctor',
  },
  socialite: {
    path: '/assets/characters/socialite.png',
    label: 'Socialite',
  },
  gardener: {
    path: '/assets/characters/gardener.png',
    label: 'Gardener',
  },
  unknown: {
    path: '',
    label: 'Unknown',
  },
}

export const AVAILABLE_ASSET_KEYS = Object.keys(CHARACTER_ASSETS).filter(
  (key) => key !== 'unknown',
)
