# ARTVAULT smoke test (Parts 2-5). Run with the server running and the database seeded:
#   powershell -ExecutionPolicy Bypass -File tests\smoke-test.ps1
# It trades with the seeded demo accounts, so re-seed afterwards with: npm run db:seed

$base = 'http://localhost:4000/api'
$script:fail = 0

function Api($method, $path, $token, $body) {
  $h = @{}
  if ($token) { $h.Authorization = "Bearer $token" }
  $p = @{ Method = $method; Uri = "$base$path"; Headers = $h }
  if ($body) { $p.ContentType = 'application/json'; $p.Body = ($body | ConvertTo-Json -Depth 5) }
  try {
    return @{ ok = $true; status = 200; data = (Invoke-RestMethod @p) }
  } catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    return @{ ok = $false; status = $code; data = $_.ErrorDetails.Message }
  }
}

function Check($name, $cond, $detail) {
  if ($cond) { Write-Host "PASS  $name" -ForegroundColor Green }
  else { Write-Host "FAIL  $name   $detail" -ForegroundColor Red; $script:fail++ }
}

function Bal($token) { [math]::Round([double](Api GET '/auth/me' $token).data.user.walletBalance, 2) }

Write-Host "`n== Auth ==" -ForegroundColor Cyan
$health = Api GET '/health'
Check 'health endpoint' ($health.ok -and $health.data.users -ge 8) $health.data
$A = Api POST '/auth/login' $null @{ email = 'collectora@artvault.dev'; password = 'password123' }
$B = Api POST '/auth/login' $null @{ email = 'collectorb@artvault.dev'; password = 'password123' }
$R = Api POST '/auth/login' $null @{ email = 'rahul@artvault.dev'; password = 'password123' }
Check 'login collector A' $A.ok $A.data
Check 'login collector B' $B.ok $B.data
Check 'login artist Rahul' $R.ok $R.data
Check 'wrong password rejected' ((Api POST '/auth/login' $null @{ email = 'collectora@artvault.dev'; password = 'nope-nope' }).status -eq 401)
Check '/me without token is 401' ((Api GET '/auth/me').status -eq 401)
$ta = $A.data.token; $tb = $B.data.token; $tr = $R.data.token
$rahulId = $R.data.user.id
Check 'collector cannot issue artist units' ((Api POST '/artist/market' $ta @{ totalUnits = 100; initialPrice = 10 }).status -eq 403)

Write-Host "`n== Read APIs ==" -ForegroundColor Cyan
$prods = (Api GET "/products?artistId=$rahulId").data.items
Check 'product list' ($prods.Count -ge 1)
$markets = Api GET '/market'
Check 'market list has 4 artists' ($markets.ok -and $markets.data.items.Count -ge 4) $markets.data
$detail = Api GET "/market/$rahulId"
Check 'market detail' ($detail.ok -and $detail.data.market.totalUnits -gt 0) $detail.data
$hist = Api GET "/market/$rahulId/history"
Check 'price history has points' ($hist.ok -and $hist.data.points.Count -gt 1) $hist.data
$act = Api GET "/market/$rahulId/activity"
Check 'activity feed' ($act.ok -and $act.data.events.Count -gt 0) $act.data

Write-Host "`n== Product checkout ==" -ForegroundColor Cyan
$prod = $prods[0]
$a0 = Bal $ta; $r0 = Bal $tr
$co = Api POST '/orders' $ta @{ productId = $prod.id; quantity = 1 }
Check 'A buys a product' $co.ok $co.data
if ($co.ok) {
  $s = $co.data.split
  $diff = [math]::Round($s.platformFee + $s.paidToHolders + $s.artistReceived - $co.data.order.totalPrice, 2)
  Check 'money split adds up exactly' ($diff -eq 0) "diff=$diff"
  Check 'buyer balance went down' ((Bal $ta) -lt $a0)
  Check 'artist balance went up' ((Bal $tr) -gt $r0)
}
Check 'artist cannot buy own product' ((Api POST '/orders' $tr @{ productId = $prod.id }).status -eq 403)

Write-Host "`n== Unit trading ==" -ForegroundColor Cyan
$price0 = [double]$detail.data.market.currentPrice
$b = Api POST '/market/buy' $ta @{ artistId = $rahulId; quantity = 2 }
Check 'A buys 2 new units' $b.ok $b.data
if ($b.ok) {
  $u1 = $b.data.trades[0].unitId; $u2 = $b.data.trades[1].unitId
  Check 'artist cannot buy own units' ((Api POST '/market/buy' $tr @{ artistId = $rahulId }).status -eq 403)
  Check 'B cannot list a unit A owns' ((Api POST '/market/sell' $tb @{ unitId = $u1; askingPrice = 999 }).status -eq 403)

  $ask = [math]::Round($price0 * 2, 2)
  $s1 = Api POST '/market/sell' $ta @{ unitId = $u1; askingPrice = $ask }
  Check 'A lists unit 1' $s1.ok $s1.data
  Check 'listing the same unit twice is blocked' ((Api POST '/market/sell' $ta @{ unitId = $u1; askingPrice = $ask }).status -eq 409)

  $s2 = Api POST '/market/sell' $ta @{ unitId = $u2; askingPrice = 500000 }
  Check 'A lists unit 2 at a huge price' $s2.ok $s2.data
  Check 'B cannot afford the huge listing' ((Api POST '/market/buy' $tb @{ sellOrderId = $s2.data.order.id }).status -eq 400)
  Check 'B cannot cancel A listing' ((Api DELETE "/market/orders/$($s2.data.order.id)" $tb).status -eq 403)
  Check 'A cancels own listing' ((Api DELETE "/market/orders/$($s2.data.order.id)" $ta).ok)

  $listed = (Api GET "/market/orders?artistId=$rahulId").data.orders
  Check 'open listing is visible' (($listed | Where-Object { $_.id -eq $s1.data.order.id }).Count -eq 1)

  $fill = Api POST '/market/buy' $tb @{ sellOrderId = $s1.data.order.id }
  Check 'B buys the listed unit' $fill.ok $fill.data
  if ($fill.ok) {
    $sp = $fill.data.split
    $diff2 = [math]::Round($sp.sellerReceived + $sp.artistRoyalty + $sp.platformFee - $ask, 2)
    Check 'resale split adds up exactly' ($diff2 -eq 0) "diff=$diff2"
  }
  Check 'second buyer is rejected (UNIT NO LONGER AVAILABLE)' ((Api POST '/market/buy' $tb @{ sellOrderId = $s1.data.order.id }).status -eq 409)

  $d2 = Api GET "/market/$rahulId"
  Check 'market price equals last trade price' ([math]::Round([double]$d2.data.market.currentPrice, 2) -eq $ask) "price=$($d2.data.market.currentPrice) expected=$ask"
  $bu = Api GET '/portfolio/units' $tb
  Check 'B now owns the unit' (($bu.data.units | Where-Object { $_.id -eq $u1 }).Count -eq 1)
}

Write-Host "`n== Portfolio and dashboard ==" -ForegroundColor Cyan
$p = Api GET '/portfolio' $ta
Check 'portfolio summary' ($p.ok -and $p.data.summary.unitsHeld -ge 1) $p.data
Check 'trade history' ((Api GET '/portfolio/history' $ta).ok)
Check 'wallet ledger' ((Api GET '/portfolio/wallet' $ta).ok)
Check 'payout history' ((Api GET '/portfolio/payouts' $ta).ok)
$dash = Api GET '/artist/dashboard' $tr
Check 'artist dashboard' ($dash.ok -and $dash.data.earnings.total -gt 0) $dash.data
Check 'artist earnings list' ((Api GET '/artist/earnings' $tr).ok)
Check 'artist holders list' ((Api GET '/artist/holders' $tr).ok)
Check 'collector blocked from artist dashboard' ((Api GET '/artist/dashboard' $ta).status -eq 403)

Write-Host ""
if ($script:fail -eq 0) { Write-Host 'ALL CHECKS PASSED' -ForegroundColor Green }
else { Write-Host "$($script:fail) CHECK(S) FAILED - paste the FAIL lines to get help" -ForegroundColor Red }