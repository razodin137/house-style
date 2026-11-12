/*
 * Fixture pair for the JS lane: good.js is the house style, and eslint --fix
 * rewrites unformatted.js to match it.
 */

const taxRate=0.2;

function subtotal( prices ){
  let sum=0;

  for(let index=0;index<prices.length;index++){
    sum+=prices[index];
  }

  return sum;
}

class Invoice{
  #lines=[];

  add( line ){
    this.#lines.push( line );
  }

  total( ){
    const prices=this.#lines.map((line)=>line.price);

    return subtotal( prices )*( 1+taxRate );
  }
}

function describe( invoice ){
  const { total }=invoice;
  const amount=total().toFixed(2);

  return `Total: ${ amount }`;
}

export { Invoice, describe };
