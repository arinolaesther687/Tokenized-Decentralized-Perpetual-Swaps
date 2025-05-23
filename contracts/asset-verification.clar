;; Asset Verification Contract
;; This contract validates the underlying instruments for perpetual swaps

(define-data-var admin principal tx-sender)

;; Map of verified assets with their price feed contracts
(define-map verified-assets (string-ascii 32) {
  price-feed: principal,
  decimals: uint,
  active: bool
})

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ASSET-EXISTS u101)
(define-constant ERR-ASSET-NOT-FOUND u102)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin)))

;; Add a new asset to the verified list
(define-public (add-asset (asset-symbol (string-ascii 32)) (price-feed principal) (decimals uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (map-get? verified-assets asset-symbol)) (err ERR-ASSET-EXISTS))
    (ok (map-set verified-assets asset-symbol {
      price-feed: price-feed,
      decimals: decimals,
      active: true
    }))
  )
)

;; Update an existing asset
(define-public (update-asset (asset-symbol (string-ascii 32)) (price-feed principal) (decimals uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-some (map-get? verified-assets asset-symbol)) (err ERR-ASSET-NOT-FOUND))
    (ok (map-set verified-assets asset-symbol {
      price-feed: price-feed,
      decimals: decimals,
      active: true
    }))
  )
)

;; Deactivate an asset
(define-public (deactivate-asset (asset-symbol (string-ascii 32)))
  (let ((asset (unwrap! (map-get? verified-assets asset-symbol) (err ERR-ASSET-NOT-FOUND))))
    (begin
      (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
      (ok (map-set verified-assets asset-symbol
        (merge asset { active: false })))
    )
  )
)

;; Activate an asset
(define-public (activate-asset (asset-symbol (string-ascii 32)))
  (let ((asset (unwrap! (map-get? verified-assets asset-symbol) (err ERR-ASSET-NOT-FOUND))))
    (begin
      (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
      (ok (map-set verified-assets asset-symbol
        (merge asset { active: true })))
    )
  )
)

;; Check if an asset is verified and active
(define-read-only (is-asset-active (asset-symbol (string-ascii 32)))
  (match (map-get? verified-assets asset-symbol)
    asset (get active asset)
    false
  )
)

;; Get asset details
(define-read-only (get-asset-details (asset-symbol (string-ascii 32)))
  (map-get? verified-assets asset-symbol)
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (ok (var-set admin new-admin))
  )
)
