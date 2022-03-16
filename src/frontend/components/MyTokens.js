import { useState, useEffect, useRef } from 'react'
import { ethers } from "ethers"
import Identicon from 'identicon.js';
import { Row, Col, Card, Button, InputGroup, Form } from 'react-bootstrap'

export default function MyTokens({ nftMarketplace }) {
  const audioRef = useRef([]);
  const [loading, setLoading] = useState(true)
  const [myTokens, setMyTokens] = useState(null)
  const [isPlaying, setIsPlaying] = useState(null)
  const [selected, setSelected] = useState(null)
  const [inputIndex, setInputIndex] = useState(null)
  const [resellPrice, setResellPrice] = useState(null)
  const loadMyTokens = async () => {
    // Get all unsold items/tokens
    const results = await nftMarketplace.getMyTokens()
    const myTokens = await Promise.all(results.map(async i => {
      // get uri url from contract
      const uri = await nftMarketplace.tokenURI(i.tokenId)
      // use uri to fetch the nft metadata stored on ipfs 
      const response = await fetch(uri + ".json")
      const metadata = await response.json()
      const identicon = `data:image/png;base64,${new Identicon(metadata.name + metadata.price, 330).toString()}`
      // define item object
      let item = {
        price: i.price,
        itemId: i.tokenId,
        name: metadata.name,
        audio: metadata.audio,
        identicon,
        resellPrice: null
      }
      return item
    }))
    setIsPlaying(isPlaying)
    setMyTokens(myTokens)
    setLoading(false)
  }
  const resellItem = async (item) => {
    console.log(item.itemId.toString(), inputIndex)
    if(resellPrice === "0" || item.itemId.toString() !== inputIndex.toString() || !resellPrice ) return
    // Get royalty fee
    const fee = await nftMarketplace.royaltyFee()
    const price = ethers.utils.parseEther(resellPrice.toString())
    await (await nftMarketplace.resellToken(item.itemId, price, { value: fee })).wait()
    loadMyTokens()
  }
  useEffect(() => {
    {
      if (isPlaying) {
        audioRef.current[selected].play()
      } else if (isPlaying !== null) {
        audioRef.current[selected].pause()
      }
    }
  })

  useEffect(() => {
    loadMyTokens()
  }, [])

  if (loading) return (
    <main style={{ padding: "1rem 0" }}>
      <h2>Loading...</h2>
    </main>
  )

  return (
    <div className="flex justify-center">
      {myTokens.length > 0 ?
        <div className="px-5 container">
          <Row xs={1} md={2} lg={4} className="g-4 py-5">
            {myTokens.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <audio src={item.audio} key={idx} ref={el => audioRef.current[idx] = el}></audio>
                <Card>
                  <Card.Img variant="top" src={item.identicon} />
                  <Card.Body color="secondary">
                    <Card.Title>{item.name}</Card.Title>
                    <div className="d-grid px-4">
                      <Button variant="secondary" onClick={() => {
                        setSelected(idx)
                        setIsPlaying(!isPlaying)
                      }}>
                        {isPlaying && selected === idx ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-pause" viewBox="0 0 16 16">
                            <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-play" viewBox="0 0 16 16">
                            <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z" />
                          </svg>
                        )}
                      </Button>
                    </div>
                    <Card.Text className="mt-1">
                      {ethers.utils.formatEther(item.price)} ETH
                    </Card.Text>
                  </Card.Body>
                  <Card.Footer>
                    <InputGroup className="my-1">
                      <Button onClick={() => resellItem(item)} variant="outline-secondary" id="button-addon1">
                        Resell
                      </Button>
                      <Form.Control
                        onChange={(e) => {
                          setInputIndex(idx)
                          setResellPrice(e.target.value)
                        }}
                        size="md"
                        value={inputIndex === idx ? resellPrice : ''}
                        required type="number"
                        placeholder="Price in ETH"
                      />
                    </InputGroup>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
        : (
          <main style={{ padding: "1rem 0" }}>
            <h2>No owned tokens</h2>
          </main>
        )}
    </div>
  );
}