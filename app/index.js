 

const ID = await fetch("https://random-word-api.herokuapp.com/word?number=2&swear=0").then(response=>response.json());
const user = "" + ID[0]+ "" + ID[1]
    const realtime = new Ably.Realtime({
        key: "inf2Cg.5ckMeA:yOcGE03_k3DzuvdrGFS-G1Cr_J8r9pRSbopgb4Z_fs0", /* ADD YOUR API KEY HERE */
        clientId: user, /* This is who you will appear as in the presence set */
        closeOnUnload: true // See https://support.ably.io/solution/articles/3000059875-why-don-t-presence-members-leave-as-soon-as-i-close-a-tab-
      });
  
      /* Enter the presence set of the 'chatroom' channel */
    const channel = realtime.channels.get('inbound:' + user);
    channel.attach(function(err) {
        if(err) { return console.error("Error attaching to the channel"); }
        console.log('We are now attached to the channel');
        channel.presence.enter('hello', function(err) {
          if(err) { return console.error("Error entering presence"); }
          console.log('We are now successfully present');
        });


  
        /* Every time the presence set changes, show the new set */
        channel.presence.subscribe(function(presenceMsg) {
          console.log('Received a ' + presenceMsg.action + ' from ' + presenceMsg.clientId);
          channel.presence.get(function(err, members) {
            if(err) { return console.log("Error fetching presence data: " + err); }

          });
        });
      });


      const updates = realtime.channels.get('outbound');
      updates.subscribe(function(msg) {
        for (const [key, value] of Object.entries(msg.data)) {
          if(key in inbount_points){
          inbount_points[key].push(...value)
          // for (const [key, value] of Object.entries(inbount_points)) {
          //   console.log(`${key}: ${value}`);
          // }
        }
        else{
          inbount_points[key] = value;
        }
  
        }
 
      });
    // const ws = await connectToServer();
    
    let my_points = [];

    let inbount_points = {};


    function addOrMove(name, pos) {
       
         
        let my_cursor = getOrCreateCursorFor(name);
        if(pos){
          my_cursor.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
        }
    };        
    
    document.body.onmousemove = (evt) => {
        my_points.push ({ x: evt.clientX, y: evt.clientY });
        // const messageBody = { x: evt.clientX, y: evt.clientY };
        // ws.send(JSON.stringify(messageBody));
    };
    
    async function sendToAbly(data){
      
      // console.log("sending:  " + data)
      channel.publish(user, data);

    }

    const timer = setInterval(() => {
      if (my_points.length >2){
        sendToAbly(simplify(my_points, 3, true))
        my_points.length = 0
      
      }
    }, 1001);

    const itter = setInterval(()=>{
      for (const [key, value] of Object.entries(inbount_points)) {
        if(key === user){}
        else{
      //  console.log(`${key}: ${value}`);
        addOrMove(key,value.shift())
        }
      }

    }
    ,55);

  
    function getOrCreateCursorFor(name) {
        
        const existing = document.querySelector(`[data-sender='${name}']`);
        if (existing) {
            return existing;
        }
        
        const template = document.getElementById('cursor');
        const cursor = template.content.firstElementChild.cloneNode(true);
        const svgPath = cursor.getElementsByTagName('path')[0];    
            
        cursor.setAttribute("data-sender", name);
        svgPath.setAttribute('fill', `hsl(${ Math.floor(Math.random() * 360)}, 50%, 50%)`);    
        document.body.appendChild(cursor);

        return cursor;
    }


    function lerp(v0, v1, t) {
        return v0*(1-t)+v1*t
    }
