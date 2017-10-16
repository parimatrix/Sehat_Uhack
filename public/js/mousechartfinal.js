var ctx = document.getElementById("myChart").getContext('2d');
console.log(JSON.parse(localStorage.getItem('myStorage'))["data"]);
var myLineChart = new Chart(ctx, {
    type: 'line',
    data: {
    	labels: ["1", "2", "3", "4", "5","6","7"],
    	datasets: [{
            label: '%Error',
            data: JSON.parse(localStorage.getItem('myStorage'))["data"].slice(JSON.parse(localStorage.getItem('myStorage'))["data"].length-7,JSON.parse(localStorage.getItem('myStorage'))["data"].length),
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
                'rgba(255,99,132,1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
    	maintainAspectRatio: true,
    	responsive: true,
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero:true
                }
            }]
        }
    }
});
//ctx.canvas.width = 300;
//ctx.canvas.height = 300;
