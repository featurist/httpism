module.exports = merge (x) into (y) =
  if (x @and y)
    r = {}

    for each @(ykey) in (Object.keys(y))
      r.(ykey) = y.(ykey)

    for each @(xkey) in (Object.keys(x))
      r.(xkey) = x.(xkey)

    r
  else if (y)
    y
  else
    x
