const knowledgeBase = require('./services/knowledgeBase');

(async () => {
    await knowledgeBase.loadArticles();
    
    console.log("-------------------");
    console.log("Query: 'software_install'");
    let article1 = knowledgeBase.findArticle("software_install");
    console.log(article1 ? article1.title : "Not found");
    
    console.log("-------------------");
    console.log("Query: 'need install chrome'");
    let article2 = knowledgeBase.findArticle("need install chrome");
    console.log(article2 ? article2.title : "Not found");
    
})();
